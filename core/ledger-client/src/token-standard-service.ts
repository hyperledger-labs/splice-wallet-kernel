// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    TokenStandardClient,
    TRANSFER_FACTORY_INTERFACE_ID,
    HOLDING_INTERFACE_ID,
    ALLOCATION_FACTORY_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    HoldingView,
    AllocationFactory_Allocate,
    AllocationSpecification,
    Transfer,
    transferInstructionRegistryTypes,
    allocationInstructionRegistryTypes,
    ExtraArgs,
    Metadata,
    FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
    Holding,
    ContractId,
    Beneficiaries,
} from '@canton-network/core-token-standard'
import { Logger, PartyId } from '@canton-network/core-types'
import { LedgerClient } from './ledger-client.js'
import { TokenStandardTransactionInterfaces } from './constants.js'
import {
    ensureInterfaceViewIsPresent,
    TransactionFilterBySetup,
    EventFilterBySetup,
    defaultRetryableOptions,
} from './ledger-api-utils.js'
import { TransactionParser } from './txparse/parser.js'
import {
    PrettyContract,
    renderTransaction,
    ViewValue,
} from './txparse/types.js'

import type { PrettyTransactions, Transaction } from './txparse/types.js'
import { Types } from './ledger-client.js'
import {
    ScanProxyClient,
    ScanProxyTypes,
} from '@canton-network/core-splice-client'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'

const MEMO_KEY = 'splice.lfdecentralizedtrust.org/reason'
const REQUESTED_AT_SKEW_MS = 60_000

export type ExerciseCommand = Types['ExerciseCommand']
export type DisclosedContract = Types['DisclosedContract']
const EMPTY_META: Metadata = { values: {} }

type JsGetActiveContractsResponse = Types['JsGetActiveContractsResponse']
export type JsGetUpdatesResponse = Types['JsGetUpdatesResponse']
type JsGetTransactionResponse = Types['JsGetTransactionResponse']
type OffsetCheckpoint2 = Types['OffsetCheckpoint2']
type JsTransaction = Types['JsTransaction']
type TransactionFormat = Types['TransactionFormat']

type OffsetCheckpointUpdate = {
    update: { OffsetCheckpoint: OffsetCheckpoint2 }
}
type TransactionUpdate = {
    update: { Transaction: { value: JsTransaction } }
}

type JsActiveContractEntryResponse = JsGetActiveContractsResponse & {
    contractEntry: {
        JsActiveContract: {
            createdEvent: Types['CreatedEvent']
        }
    }
}

type CreateTransferChoiceArgs = {
    expectedAdmin: PartyId
    transfer: Transfer
    extraArgs: ExtraArgs
}

export class CoreService {
    constructor(
        private ledgerClient: LedgerClient,
        private scanProxyClient: ScanProxyClient,
        private readonly logger: Logger,
        private accessTokenProvider: AccessTokenProvider,
        private readonly isMasterUser: boolean,
        private isAdmin: boolean = false,
        private accessToken: string = ''
    ) {}

    getTokenStandardClient(registryUrl: string): TokenStandardClient {
        return new TokenStandardClient(
            registryUrl,
            this.logger,
            this.isAdmin,
            this.accessToken,
            this.accessTokenProvider
        )
    }

    async getInputHoldingsCids(sender: PartyId, inputUtxos?: string[]) {
        const now = new Date()
        if (inputUtxos && inputUtxos.length > 0) {
            return inputUtxos
        }
        const senderHoldings = await this.listContractsByInterface<HoldingView>(
            HOLDING_INTERFACE_ID,
            sender
        )
        if (senderHoldings.length === 0) {
            throw new Error(
                "Sender has no holdings, so transfer can't be executed."
            )
        }

        return senderHoldings
            .filter((utxo) => {
                //filter out locked holdings
                const lock = utxo.interfaceViewValue.lock
                if (!lock) return true

                const expiresAt = lock.expiresAt
                if (!expiresAt) return false

                const expiresAtDate = new Date(expiresAt)
                return expiresAtDate <= now
            })
            .map((h) => h.contractId)
        /* TODO: optimize input holding selection, currently if you transfer 10 CC and have 10 inputs of 1000 CC,
                then all 10 of those are chose as input.
             */
    }

    async listContractsByInterface<T = ViewValue>(
        interfaceId: string,
        partyId?: PartyId,
        limit?: number
    ): Promise<PrettyContract<T>[]> {
        try {
            const ledgerEnd = await this.ledgerClient.getWithRetry(
                '/v2/state/ledger-end'
            )
            const acsResponses: JsGetActiveContractsResponse[] =
                await this.ledgerClient.postWithRetry(
                    '/v2/state/active-contracts',
                    {
                        filter: TransactionFilterBySetup(interfaceId, {
                            isMasterUser: this.isMasterUser,
                            partyId: partyId,
                        }),
                        verbose: false,
                        activeAtOffset: ledgerEnd.offset,
                    },
                    defaultRetryableOptions,
                    {
                        query: limit ? { limit: limit.toString() } : {},
                    }
                )

            /*  This filters out responses with entries of:
                - JsEmpty
                - JsIncompleteAssigned
                - JsIncompleteUnassigned
                while leaving JsActiveContract.
                It works fine only with single synchronizer
                TODO (#353) add support for multiple synchronizers
             */
            const isActiveContractEntry = (
                acsResponse: JsGetActiveContractsResponse
            ): acsResponse is JsActiveContractEntryResponse =>
                !!acsResponse.contractEntry.JsActiveContract?.createdEvent

            const activeContractEntries = acsResponses.filter(
                isActiveContractEntry
            )
            return activeContractEntries.map(
                (response: JsActiveContractEntryResponse) =>
                    this.toPrettyContract<T>(interfaceId, response)
            )
        } catch (err) {
            this.logger.error(
                `Failed to list contracts of interface ${interfaceId}`,
                err
            )
            throw err
        }
    }

    async toPrettyTransactions(
        updates: JsGetUpdatesResponse[],
        partyId: PartyId,
        ledgerClient: LedgerClient
    ): Promise<PrettyTransactions> {
        // Runtime filters that also let TS know which of OneOfs types to check against
        const isOffsetCheckpointUpdate = (
            updateResponse: JsGetUpdatesResponse
        ): updateResponse is OffsetCheckpointUpdate =>
            !!updateResponse?.update?.OffsetCheckpoint
        const isTransactionUpdate = (
            updateResponse: JsGetUpdatesResponse
        ): updateResponse is TransactionUpdate =>
            !!updateResponse.update?.Transaction?.value

        const offsetCheckpoints: number[] = updates
            .filter(isOffsetCheckpointUpdate)
            .map((update) => update.update.OffsetCheckpoint.value.offset)
        const latestCheckpointOffset = Math.max(...offsetCheckpoints)

        const transactions: Transaction[] = await Promise.all(
            updates
                // exclude OffsetCheckpoint, Reassignment, TopologyTransaction
                .filter(isTransactionUpdate)
                .map(async (update) => {
                    const tx = update.update.Transaction.value
                    const parser = new TransactionParser(
                        tx,
                        ledgerClient,
                        partyId,
                        this.isMasterUser
                    )

                    return await parser.parseTransaction()
                })
        )

        return {
            // OffsetCheckpoint can be anywhere... or not at all, maybe
            nextOffset: Math.max(
                latestCheckpointOffset,
                ...transactions.map((tx) => tx.offset)
            ),
            transactions: transactions
                .filter((tx) => tx.events.length > 0)
                .map(renderTransaction),
        }
    }

    async toPrettyTransaction(
        getTransactionResponse: JsGetTransactionResponse,
        partyId: PartyId,
        ledgerClient: LedgerClient
    ): Promise<Transaction> {
        const tx = getTransactionResponse.transaction
        const parser = new TransactionParser(
            tx,
            ledgerClient,
            partyId,
            this.isMasterUser
        )
        const parsedTx = await parser.parseTransaction()
        return renderTransaction(parsedTx)
    }

    async toPrettyTransactionsPerParty(
        updates: JsGetUpdatesResponse[],
        parties: PartyId[],
        ledgerClient: LedgerClient
    ): Promise<Map<PartyId, PrettyTransactions>> {
        const all = await Promise.all(
            parties.map(
                async (partyId): Promise<[PartyId, PrettyTransactions]> => [
                    partyId,
                    await this.toPrettyTransactions(
                        updates,
                        partyId,
                        ledgerClient
                    ),
                ]
            )
        )
        return new Map(all)
    }

    // returns object with JsActiveContract content
    // and contractId and interface view value extracted from it as separate fields for convenience
    private toPrettyContract<T>(
        interfaceId: string,
        response: JsActiveContractEntryResponse
    ): PrettyContract<T> {
        const activeContract = response.contractEntry.JsActiveContract
        const { createdEvent } = activeContract
        return {
            contractId: createdEvent.contractId,
            activeContract,
            interfaceViewValue: ensureInterfaceViewIsPresent(
                createdEvent,
                interfaceId
            ).viewValue as T,
        }
    }

    async getActiveOpenMiningRound(): Promise<
        ScanProxyTypes['Contract'] | null
    > {
        const openMiningRounds =
            await this.scanProxyClient.getOpenMiningRounds()
        if (!(Array.isArray(openMiningRounds) && openMiningRounds.length)) {
            throw new Error('OpenMiningRound contract not found')
        }

        const nowForOpenMiningRounds = Date.now()
        const latestOpenMiningRound = openMiningRounds.findLast(
            (openMiningRound) => {
                const { opensAt, targetClosesAt } = openMiningRound.payload
                const opensAtMs = Number(new Date(opensAt))
                const targetClosesAtMs = Number(new Date(targetClosesAt))

                return (
                    opensAtMs <= nowForOpenMiningRounds &&
                    targetClosesAtMs > nowForOpenMiningRounds
                )
            }
        )
        return latestOpenMiningRound ?? null
    }
}

class AllocationService {
    constructor(
        private core: CoreService,
        private readonly logger: Logger
    ) {}

    public async buildAllocationFactoryChoiceArgs(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        inputUtxos?: string[],
        requestedAt?: string
    ): Promise<AllocationFactory_Allocate> {
        const allocationSpecificationNormalized: AllocationSpecification = {
            ...allocationSpecification,
            settlement: {
                ...allocationSpecification.settlement,
                meta: allocationSpecification.settlement.meta ?? { values: {} },
            },
            transferLeg: {
                ...allocationSpecification.transferLeg,
                meta: allocationSpecification.transferLeg.meta ?? {
                    values: {},
                },
            },
        }

        const inputHoldingCids = await this.core.getInputHoldingsCids(
            allocationSpecificationNormalized.transferLeg.sender,
            inputUtxos
        )

        return {
            expectedAdmin,
            allocation: allocationSpecificationNormalized,
            requestedAt:
                requestedAt ??
                new Date(Date.now() - REQUESTED_AT_SKEW_MS).toISOString(),
            inputHoldingCids:
                inputHoldingCids as unknown as ContractId<Holding>[],
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }
    }

    async fetchAllocationFactoryChoiceContext(
        registryUrl: string,
        choiceArgs: AllocationFactory_Allocate
    ): Promise<
        allocationInstructionRegistryTypes['schemas']['FactoryWithChoiceContext']
    > {
        return this.core
            .getTokenStandardClient(registryUrl)
            .post('/registry/allocation-instruction/v1/allocation-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
            })
    }

    async createAllocationInstructionFromContext(
        factoryId: string,
        choiceArgs: AllocationFactory_Allocate,
        choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        choiceArgs.extraArgs.context = {
            ...choiceContext.choiceContextData,
            values: choiceContext.choiceContextData?.values ?? {},
        }
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_FACTORY_INTERFACE_ID,
            contractId: factoryId,
            choice: 'AllocationFactory_Allocate',
            choiceArgument: choiceArgs,
        }
        return [exercise, choiceContext.disclosedContracts]
    }

    async createAllocationInstruction(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        registryUrl: string,
        inputUtxos?: string[],
        requestedAt?: string,
        prefetchedRegistryChoiceContext?: {
            factoryId: string
            choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const choiceArgs = await this.buildAllocationFactoryChoiceArgs(
            allocationSpecification,
            expectedAdmin,
            inputUtxos,
            requestedAt
        )

        if (prefetchedRegistryChoiceContext) {
            return this.createAllocationInstructionFromContext(
                prefetchedRegistryChoiceContext.factoryId,
                choiceArgs,
                prefetchedRegistryChoiceContext.choiceContext
            )
        }

        const { factoryId, choiceContext } =
            await this.fetchAllocationFactoryChoiceContext(
                registryUrl,
                choiceArgs
            )
        return this.createAllocationInstructionFromContext(
            factoryId,
            choiceArgs,
            choiceContext
        )
    }

    private buildAllocationExerciseWithContext(
        templateId: string,
        contractId: string,
        choice:
            | 'Allocation_ExecuteTransfer'
            | 'Allocation_Withdraw'
            | 'Allocation_Cancel',
        choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        const exercise: ExerciseCommand = {
            templateId,
            contractId,
            choice,
            choiceArgument: {
                extraArgs: {
                    context: choiceContext.choiceContextData,
                    meta: EMPTY_META,
                },
            },
        }
        return [exercise, choiceContext.disclosedContracts ?? []]
    }

    async fetchExecuteTransferChoiceContext(
        allocationId: string,
        registryUrl: string
    ) {
        return this.core.getTokenStandardClient(registryUrl).post(
            '/registry/allocations/v1/{allocationId}/choice-contexts/execute-transfer',
            {},
            {
                path: {
                    allocationId,
                },
            }
        )
    }

    createExecuteTransferAllocationFromContext(
        allocationCid: string,
        choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        return this.buildAllocationExerciseWithContext(
            ALLOCATION_INTERFACE_ID,
            allocationCid,
            'Allocation_ExecuteTransfer',
            choiceContext
        )
    }

    async createExecuteTransferAllocation(
        allocationCid: string,
        registryUrl: string,
        prefetchedRegistryChoiceContext?: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createExecuteTransferAllocationFromContext(
                allocationCid,
                prefetchedRegistryChoiceContext
            )
        }
        const choiceContext = await this.fetchExecuteTransferChoiceContext(
            allocationCid,
            registryUrl
        )
        return this.createExecuteTransferAllocationFromContext(
            allocationCid,
            choiceContext
        )
    }

    async fetchWithdrawAllocationChoiceContext(
        allocationCid: string,
        registryUrl: string
    ): Promise<allocationInstructionRegistryTypes['schemas']['ChoiceContext']> {
        return this.core
            .getTokenStandardClient(registryUrl)
            .post(
                '/registry/allocations/v1/{allocationId}/choice-contexts/withdraw',
                {},
                { path: { allocationId: allocationCid } }
            )
    }

    createWithdrawAllocationFromContext(
        allocationCid: string,
        choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        return this.buildAllocationExerciseWithContext(
            ALLOCATION_INTERFACE_ID,
            allocationCid,
            'Allocation_Withdraw',
            choiceContext
        )
    }

    async createWithdrawAllocation(
        allocationCid: string,
        registryUrl: string,
        prefetchedRegistryChoiceContext?: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createWithdrawAllocationFromContext(
                allocationCid,
                prefetchedRegistryChoiceContext
            )
        }
        const choiceContext = await this.fetchWithdrawAllocationChoiceContext(
            allocationCid,
            registryUrl
        )
        return this.createWithdrawAllocationFromContext(
            allocationCid,
            choiceContext
        )
    }

    async fetchCancelAllocationChoiceContext(
        allocationCid: string,
        registryUrl: string
    ): Promise<allocationInstructionRegistryTypes['schemas']['ChoiceContext']> {
        return this.core
            .getTokenStandardClient(registryUrl)
            .post(
                '/registry/allocations/v1/{allocationId}/choice-contexts/cancel',
                {},
                { path: { allocationId: allocationCid } }
            )
    }

    createCancelAllocationFromContext(
        allocationCid: string,
        choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        return this.buildAllocationExerciseWithContext(
            ALLOCATION_INTERFACE_ID,
            allocationCid,
            'Allocation_Cancel',
            choiceContext
        )
    }

    async createCancelAllocation(
        allocationCid: string,
        registryUrl: string,
        prefetchedRegistryChoiceContext?: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createCancelAllocationFromContext(
                allocationCid,
                prefetchedRegistryChoiceContext
            )
        }
        const choiceContext = await this.fetchCancelAllocationChoiceContext(
            allocationCid,
            registryUrl
        )
        return this.createCancelAllocationFromContext(
            allocationCid,
            choiceContext
        )
    }

    async createWithdrawAllocationInstruction(
        allocationInstructionCid: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_INSTRUCTION_INTERFACE_ID,
            contractId: allocationInstructionCid,
            choice: 'AllocationInstruction_Withdraw',
            choiceArgument: {
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            },
        }
        return [exercise, []]
    }

    async createUpdateAllocationInstruction(
        allocationInstructionCid: string,
        extraActors: PartyId[] = [],
        extraArgsContext: Record<string, unknown> = {},
        extraArgsMeta: Record<string, unknown> = {}
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_INSTRUCTION_INTERFACE_ID,
            contractId: allocationInstructionCid,
            choice: 'AllocationInstruction_Update',
            choiceArgument: {
                extraActors,
                extraArgs: {
                    context: { values: extraArgsContext },
                    meta: { values: extraArgsMeta },
                },
            },
        }
        return [exercise, []]
    }

    async createRejectAllocationRequest(
        allocationRequestCid: string,
        actor: PartyId
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_REQUEST_INTERFACE_ID,
            contractId: allocationRequestCid,
            choice: 'AllocationRequest_Reject',
            choiceArgument: {
                actor,
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            },
        }
        return [exercise, []]
    }

    async createWithdrawAllocationRequest(
        allocationRequestCid: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_REQUEST_INTERFACE_ID,
            contractId: allocationRequestCid,
            choice: 'AllocationRequest_Withdraw',
            choiceArgument: {
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            },
        }
        return [exercise, []]
    }
}

class TransferService {
    constructor(
        private core: CoreService,
        private readonly logger: Logger
    ) {}

    public async buildTransferChoiceArgs(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId,
        instrumentId: string,
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata
    ): Promise<CreateTransferChoiceArgs> {
        const inputHoldingCids: string[] = await this.core.getInputHoldingsCids(
            sender,
            inputUtxos
        )

        return {
            expectedAdmin: instrumentAdmin,
            transfer: {
                sender,
                receiver,
                amount,
                instrumentId: { admin: instrumentAdmin, id: instrumentId },
                requestedAt: new Date(
                    Date.now() - REQUESTED_AT_SKEW_MS
                ).toISOString(),
                executeBefore: (
                    expiryDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000)
                ).toISOString(),
                inputHoldingCids:
                    inputHoldingCids as unknown as ContractId<Holding>[],
                meta: { values: { [MEMO_KEY]: memo || '', ...meta?.values } },
            },
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }
    }

    async fetchTransferFactoryChoiceContext(
        registryUrl: string,
        choiceArgs: CreateTransferChoiceArgs
    ): Promise<
        transferInstructionRegistryTypes['schemas']['TransferFactoryWithChoiceContext']
    > {
        return await this.core
            .getTokenStandardClient(registryUrl)
            .post('/registry/transfer-instruction/v1/transfer-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
            })
    }

    async createTransferFromContext(
        factoryId: string,
        choiceArgs: CreateTransferChoiceArgs,
        choiceContext: transferInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        this.logger.debug('Creating transfer from pre-fetched context...')
        choiceArgs.extraArgs.context = {
            ...choiceContext.choiceContextData,
            values: choiceContext.choiceContextData?.values ?? {},
        }
        const exercise: ExerciseCommand = {
            templateId: TRANSFER_FACTORY_INTERFACE_ID,
            contractId: factoryId,
            choice: 'TransferFactory_Transfer',
            choiceArgument: choiceArgs,
        }
        return [exercise, choiceContext.disclosedContracts]
    }

    async createTransfer(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId, // TODO (#907): replace with registry call
        instrumentId: string,
        registryUrl: string,
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata,
        prefetchedRegistryChoiceContext?: {
            factoryId: string
            choiceContext: transferInstructionRegistryTypes['schemas']['ChoiceContext']
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const choiceArgs = await this.buildTransferChoiceArgs(
                sender,
                receiver,
                amount,
                instrumentAdmin,
                instrumentId,
                inputUtxos,
                memo,
                expiryDate,
                meta
            )

            if (prefetchedRegistryChoiceContext) {
                return this.createTransferFromContext(
                    prefetchedRegistryChoiceContext.factoryId,
                    choiceArgs,
                    prefetchedRegistryChoiceContext.choiceContext
                )
            }

            const { factoryId, choiceContext } =
                await this.fetchTransferFactoryChoiceContext(
                    registryUrl,
                    choiceArgs
                )

            return this.createTransferFromContext(
                factoryId,
                choiceArgs,
                choiceContext
            )
        } catch (e) {
            this.logger.error('Failed to execute transfer:', e)
            throw e
        }
    }

    async fetchAcceptTransferInstructionChoiceContext(
        transferInstructionCid: string,
        registryUrl: string
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        const client = this.core.getTokenStandardClient(registryUrl)
        const choiceContext = await client.post(
            '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/accept',
            {},
            {
                path: {
                    transferInstructionId: transferInstructionCid,
                },
            }
        )
        return {
            choiceContextData: choiceContext.choiceContextData,
            disclosedContracts: choiceContext.disclosedContracts,
        }
    }

    async createAcceptTransferInstructionFromContext(
        transferInstructionCid: string,
        choiceContext: {
            choiceContextData: unknown
            disclosedContracts: DisclosedContract[]
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const exercise: ExerciseCommand = {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID,
                contractId: transferInstructionCid,
                choice: 'TransferInstruction_Accept',
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }
            return [exercise, choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error(
                'Failed to create accept transfer instruction:',
                e
            )
            throw e
        }
    }

    async exerciseDelegateProxyTransferInstructionAccept(
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: URL,
        featuredAppRightCid: string,
        beneficiaries: Beneficiaries[]
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [acceptTransferInstructionContext, disclosedContracts] =
            await this.createAcceptTransferInstruction(
                transferInstructionCid,
                registryUrl.href
            )

        const choiceArgs = {
            cid: acceptTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries: beneficiaries,
                choiceArg: acceptTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Accept',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }

    async exerciseDelegateProxyTransferInstructionReject(
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: URL,
        featuredAppRightCid: string,
        beneficiaries: Beneficiaries[]
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [rejectTransferInstructionContext, disclosedContracts] =
            await this.createRejectTransferInstruction(
                transferInstructionCid,
                registryUrl.href
            )

        const choiceArgs = {
            cid: rejectTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries,
                choiceArg: rejectTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Reject',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }

    async exerciseDelegateProxyTransferInstructioWithdraw(
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: URL,
        featuredAppRightCid: string,
        beneficiaries: Beneficiaries[]
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [withdrawTransferInstructionContext, disclosedContracts] =
            await this.createWithdrawTransferInstruction(
                transferInstructionCid,
                registryUrl.href
            )

        const sumOfWeights: number = beneficiaries.reduce(
            (totalWeight, beneficiary) => totalWeight + beneficiary.weight,
            0
        )

        if (sumOfWeights > 1.0) {
            throw new Error('Sum of beneficiary weights is larger than 1.')
        }

        const choiceArgs = {
            cid: withdrawTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries,
                choiceArg: withdrawTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Withdraw',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }

    async createAcceptTransferInstruction(
        transferInstructionCid: string,
        registryUrl: string,
        prefetchedRegistryChoiceContext?: transferInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createAcceptTransferInstructionFromContext(
                transferInstructionCid,
                {
                    choiceContextData:
                        prefetchedRegistryChoiceContext.choiceContextData,
                    disclosedContracts:
                        prefetchedRegistryChoiceContext.disclosedContracts,
                }
            )
        }
        const choiceContext =
            await this.fetchAcceptTransferInstructionChoiceContext(
                transferInstructionCid,
                registryUrl
            )
        return this.createAcceptTransferInstructionFromContext(
            transferInstructionCid,
            choiceContext
        )
    }

    async fetchRejectTransferInstructionChoiceContext(
        transferInstructionCid: string,
        registryUrl: string
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        const client = this.core.getTokenStandardClient(registryUrl)
        const choiceContext = await client.post(
            '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/reject',
            {},
            {
                path: {
                    transferInstructionId: transferInstructionCid,
                },
            }
        )
        return {
            choiceContextData: choiceContext.choiceContextData,
            disclosedContracts: choiceContext.disclosedContracts,
        }
    }

    async createRejectTransferInstructionFromContext(
        transferInstructionCid: string,
        choiceContext: {
            choiceContextData: unknown
            disclosedContracts: DisclosedContract[]
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const exercise: ExerciseCommand = {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID,
                contractId: transferInstructionCid,
                choice: 'TransferInstruction_Reject',
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }
            return [exercise, choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error(
                'Failed to create reject transfer instruction:',
                e
            )
            throw e
        }
    }

    async createRejectTransferInstruction(
        transferInstructionCid: string,
        registryUrl: string,
        prefetchedRegistryChoiceContext?: transferInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createRejectTransferInstructionFromContext(
                transferInstructionCid,
                {
                    choiceContextData:
                        prefetchedRegistryChoiceContext.choiceContextData,
                    disclosedContracts:
                        prefetchedRegistryChoiceContext.disclosedContracts,
                }
            )
        }
        const choiceContext =
            await this.fetchRejectTransferInstructionChoiceContext(
                transferInstructionCid,
                registryUrl
            )
        return this.createRejectTransferInstructionFromContext(
            transferInstructionCid,
            choiceContext
        )
    }

    async fetchWithdrawTransferInstructionChoiceContext(
        transferInstructionCid: string,
        registryUrl: string
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        const client = this.core.getTokenStandardClient(registryUrl)

        const choiceContext = await client.post(
            '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/withdraw',
            {},
            {
                path: {
                    transferInstructionId: transferInstructionCid,
                },
            }
        )
        return {
            choiceContextData: choiceContext.choiceContextData,
            disclosedContracts: choiceContext.disclosedContracts,
        }
    }

    async createWithdrawTransferInstructionFromContext(
        transferInstructionCid: string,
        choiceContext: {
            choiceContextData: unknown
            disclosedContracts: DisclosedContract[]
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const exercise: ExerciseCommand = {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID,
                contractId: transferInstructionCid,
                choice: 'TransferInstruction_Withdraw',
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }
            return [exercise, choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error(
                'Failed to create withdraw transfer instruction:',
                e
            )
            throw e
        }
    }

    async createWithdrawTransferInstruction(
        transferInstructionCid: string,
        registryUrl: string,
        prefetchedRegistryChoiceContext?: transferInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createWithdrawTransferInstructionFromContext(
                transferInstructionCid,
                {
                    choiceContextData:
                        prefetchedRegistryChoiceContext.choiceContextData,
                    disclosedContracts:
                        prefetchedRegistryChoiceContext.disclosedContracts,
                }
            )
        }
        const choiceContext =
            await this.fetchWithdrawTransferInstructionChoiceContext(
                transferInstructionCid,
                registryUrl
            )
        return this.createWithdrawTransferInstructionFromContext(
            transferInstructionCid,
            choiceContext
        )
    }
}

export class TokenStandardService {
    private readonly core: CoreService
    readonly allocation: AllocationService
    readonly transfer: TransferService

    constructor(
        private ledgerClient: LedgerClient,
        private scanProxyClient: ScanProxyClient,
        private logger: Logger,
        private accessTokenProvider: AccessTokenProvider,
        private readonly isMasterUser: boolean
    ) {
        this.core = new CoreService(
            ledgerClient,
            scanProxyClient,
            logger,
            accessTokenProvider,
            isMasterUser
        )
        this.allocation = new AllocationService(this.core, this.logger)
        this.transfer = new TransferService(this.core, this.logger)
    }

    async getTransferPreApprovalByParty(partyId: PartyId) {
        const { transfer_preapproval } = await this.scanProxyClient.get(
            '/v0/scan-proxy/transfer-preapprovals/by-party/{party}',
            {
                path: {
                    party: partyId,
                },
            }
        )

        return transfer_preapproval
    }

    async getFeaturedAppsByParty(partyId: PartyId) {
        const { featured_app_right } = await this.scanProxyClient.get(
            '/v0/scan-proxy/featured-apps/{provider_party_id}',
            {
                path: {
                    provider_party_id: partyId,
                },
            }
        )

        return featured_app_right
    }

    async getInstrumentById(registryUrl: string, instrumentId: string) {
        try {
            const params: Record<string, unknown> = {
                path: {
                    instrumentId,
                },
            }

            const client = this.core.getTokenStandardClient(registryUrl)

            return client.get(
                '/registry/metadata/v1/instruments/{instrumentId}',
                params
            )
        } catch (e) {
            this.logger.error(e)
            throw new Error(
                `Instrument id ${instrumentId} does not exist for this instrument admin.`
            )
        }
    }

    async getInstrumentAdmin(registryUrl: string): Promise<string | undefined> {
        const client = this.core.getTokenStandardClient(registryUrl)

        const info = await client.get('/registry/metadata/v1/info')

        return info.adminId
    }

    // <T> is shape of viewValue related to queried interface.
    // i.e. when querying by TransferInstruction interfaceId, <T> would be TransferInstructionView from daml codegen
    async listContractsByInterface<T = ViewValue>(
        interfaceId: string,
        partyId?: PartyId,
        limit?: number
    ): Promise<PrettyContract<T>[]> {
        return this.core.listContractsByInterface<T>(
            interfaceId,
            partyId,
            limit
        )
    }

    async listHoldingTransactions(
        partyId: PartyId,
        afterOffset?: string,
        beforeOffset?: string
    ): Promise<PrettyTransactions> {
        try {
            this.logger.debug('Set or query offset')
            const afterOffsetOrLatest =
                Number(afterOffset) ||
                (
                    await this.ledgerClient.getWithRetry(
                        '/v2/state/latest-pruned-offsets'
                    )
                ).participantPrunedUpToInclusive
            const beforeOffsetOrLatest =
                Number(beforeOffset) ||
                (await this.ledgerClient.getWithRetry('/v2/state/ledger-end'))
                    .offset

            this.logger.debug(afterOffsetOrLatest, 'Using offset')
            const updatesResponse: JsGetUpdatesResponse[] =
                await this.ledgerClient.postWithRetry('/v2/updates/flats', {
                    updateFormat: {
                        includeTransactions: {
                            eventFormat: EventFilterBySetup(
                                TokenStandardTransactionInterfaces,
                                {
                                    includeWildcard: true,
                                    isMasterUser: this.isMasterUser,
                                    partyId: partyId,
                                }
                            ),
                            transactionShape:
                                'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                        },
                    },
                    beginExclusive: afterOffsetOrLatest,
                    endInclusive: beforeOffsetOrLatest,
                    verbose: false,
                })

            return this.core.toPrettyTransactions(
                updatesResponse,
                partyId,
                this.ledgerClient
            )
        } catch (err) {
            this.logger.error('Failed to list holding transactions.', err)
            throw err
        }
    }

    async getTransactionById(
        updateId: string,
        partyId: PartyId
    ): Promise<Transaction> {
        const transactionFormat: TransactionFormat = {
            eventFormat: EventFilterBySetup(
                TokenStandardTransactionInterfaces,
                {
                    includeWildcard: true,
                    isMasterUser: this.isMasterUser,
                    partyId: partyId,
                }
            ),
            transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
        }

        const getTransactionResponse = await this.ledgerClient.postWithRetry(
            '/v2/updates/transaction-by-id',
            {
                updateId,
                transactionFormat,
            }
        )

        return this.core.toPrettyTransaction(
            getTransactionResponse,
            partyId,
            this.ledgerClient
        )
    }

    async getInputHoldingsCids(sender: PartyId, inputUtxos?: string[]) {
        return this.core.getInputHoldingsCids(sender, inputUtxos)
    }

    async createDelegateProxyTranfser(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId, // TODO (#907): replace with registry call
        instrumentId: string,
        registryUrl: string,
        featuredAppRightCid: string,
        proxyCid: string,
        beneficiaries: Beneficiaries[],
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [transferCommand, disclosedContracts] =
            await this.transfer.createTransfer(
                sender,
                receiver,
                amount,
                instrumentAdmin,
                instrumentId,
                registryUrl,
                inputUtxos,
                memo,
                expiryDate,
                meta
            )

        const sumOfWeights: number = beneficiaries.reduce(
            (totalWeight, beneficiary) => totalWeight + beneficiary.weight,
            0
        )

        if (sumOfWeights > 1.0) {
            throw new Error('Sum of beneficiary weights is larger than 1.')
        }

        const choiceArgs = {
            cid: transferCommand.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries,
                choiceArg: transferCommand.choiceArgument,
            },
        }

        const exercise: ExerciseCommand = {
            templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
            contractId: proxyCid,
            choice: 'DelegateProxy_TransferFactory_Transfer',
            choiceArgument: choiceArgs,
        }

        return [exercise, disclosedContracts]
    }

    // TODO(#583) as it's not a part of token standard, should be moved somewhere else
    async createTap(
        receiver: string,
        amount: string,
        instrumentAdmin: string, // TODO (#907): replace with registry call
        instrumentId: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const choiceArgs = {
            expectedAdmin: instrumentAdmin,
            transfer: {
                sender: instrumentAdmin,
                receiver,
                amount,
                instrumentId: { admin: instrumentAdmin, id: instrumentId },
                lock: null,
                requestedAt: new Date(
                    Date.now() - REQUESTED_AT_SKEW_MS
                ).toISOString(),
                executeBefore: tomorrow.toISOString(),
                inputHoldingCids: [],
                meta: { values: {} },
            },
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }

        const transferFactory = await this.core
            .getTokenStandardClient(registryUrl)
            .post('/registry/transfer-instruction/v1/transfer-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
            })

        const disclosedContracts =
            transferFactory.choiceContext.disclosedContracts

        const amuletRules = await this.scanProxyClient.getAmuletRules()
        if (!amuletRules) {
            throw new Error('AmuletRules contract not found')
        }

        const latestOpenMiningRound =
            await this.scanProxyClient.getActiveOpenMiningRound()
        if (!latestOpenMiningRound) {
            throw new Error(
                'OpenMiningRound active at current moment not found'
            )
        }

        return [
            {
                templateId: amuletRules.template_id!,
                contractId: amuletRules.contract_id,
                choice: 'AmuletRules_DevNet_Tap',
                choiceArgument: {
                    receiver,
                    amount,
                    openRound: latestOpenMiningRound.contract_id,
                },
            },
            disclosedContracts,
        ]
    }

    async selfGrantFeatureAppRight(
        providerPartyId: PartyId,
        synchronizerId: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const amuletRules = await this.scanProxyClient.getAmuletRules()
        const disclosedContracts = {
            templateId: amuletRules.template_id,
            contractId: amuletRules.contract_id,
            createdEventBlob: amuletRules.created_event_blob,
            synchronizerId,
        }

        return [
            {
                templateId: amuletRules.template_id,
                contractId: amuletRules.contract_id,
                choice: 'AmuletRules_DevNet_FeatureApp',
                choiceArgument: {
                    provider: providerPartyId,
                },
            },
            [disclosedContracts],
        ]
    }

    async cancelTransferPreapproval(
        contractId: string,
        templateId: string,
        actor: PartyId
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId,
            contractId,
            choice: 'TransferPreapproval_Cancel',
            choiceArgument: { p: actor },
        }
        return [exercise, []]
    }

    async renewTransferPreapproval(
        contractId: string,
        templateId: string,
        provider: PartyId,
        synchronizerId: PartyId,
        newExpiresAt?: Date,
        inputUtxos?: string[]
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const amuletRules = await this.scanProxyClient.getAmuletRules()
        const activeRound =
            await this.scanProxyClient.getActiveOpenMiningRound()

        if (!amuletRules) {
            throw new Error('AmuletRules contract not found')
        }
        if (!activeRound) {
            throw new Error(
                'OpenMiningRound active at current moment not found'
            )
        }

        const disclosed: DisclosedContract[] = [
            {
                templateId: amuletRules.template_id,
                contractId: amuletRules.contract_id,
                createdEventBlob: amuletRules.created_event_blob,
                synchronizerId,
            },
            {
                templateId: activeRound.template_id!,
                contractId: activeRound.contract_id,
                createdEventBlob: activeRound.created_event_blob,
                synchronizerId,
            },
        ]

        const inputHoldings = await this.core.getInputHoldingsCids(
            provider,
            inputUtxos
        )

        const context = {
            context: {
                openMiningRound: activeRound.contract_id,
                issuingMiningRounds: [],
                validatorRights: [],
                featuredAppRight: null,
            },
            amuletRules: amuletRules.contract_id,
        }

        // Defaults to 90 days
        const effectiveNewExpiresAt: Date =
            newExpiresAt ?? new Date(Date.now() + 90 * 24 * 3600 * 1000)

        const exercise: ExerciseCommand = {
            templateId,
            contractId,
            choice: 'TransferPreapproval_Renew',
            choiceArgument: {
                context,
                inputs: inputHoldings.map((cid) => ({
                    tag: 'InputAmulet',
                    value: cid,
                })),
                newExpiresAt: effectiveNewExpiresAt.toISOString(),
            },
        }

        return [exercise, disclosed]
    }

    async exerciseDelegateProxyTransferInstructionAccept(
        exchangeParty: PartyId,
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: string,
        featuredAppRightCid: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [acceptTransferInstructionContext, disclosedContracts] =
            await this.transfer.createAcceptTransferInstruction(
                transferInstructionCid,
                registryUrl
            )

        const choiceArgs = {
            cid: acceptTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries: [
                    {
                        beneficiary: exchangeParty,
                        weight: 1.0,
                    },
                ],
                choiceArg: acceptTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId:
                    '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Accept',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }
}
