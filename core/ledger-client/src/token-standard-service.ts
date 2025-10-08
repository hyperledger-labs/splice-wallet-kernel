// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    TokenStandardClient,
    HoldingView,
    AllocationFactory_Allocate,
    AllocationSpecification,
    AllocationContextValue,
    HOLDING_INTERFACE_ID,
    ALLOCATION_FACTORY_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    TRANSFER_FACTORY_INTERFACE_ID,
} from '@canton-network/core-token-standard'
import { Logger, PartyId } from '@canton-network/core-types'
import { LedgerClient } from './ledger-client.js'
import { TokenStandardTransactionInterfaces } from './constants.js'
import {
    ensureInterfaceViewIsPresent,
    TransactionFilterBySetup,
    EventFilterBySetup,
} from './ledger-api-utils.js'
import { TransactionParser } from './txparse/parser.js'
import {
    PrettyContract,
    renderTransaction,
    ViewValue,
} from './txparse/types.js'

import type { PrettyTransactions, Transaction } from './txparse/types.js'
import { Types } from './ledger-client.js'
import { ScanProxyClient } from '@canton-network/core-splice-client'

const MEMO_KEY = 'splice.lfdecentralizedtrust.org/reason'

export type ExerciseCommand = Types['ExerciseCommand']
type JsGetActiveContractsResponse = Types['JsGetActiveContractsResponse']
type JsGetUpdatesResponse = Types['JsGetUpdatesResponse']
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
export type DisclosedContract = Types['DisclosedContract']

type JsActiveContractEntryResponse = JsGetActiveContractsResponse & {
    contractEntry: {
        JsActiveContract: {
            createdEvent: Types['CreatedEvent']
        }
    }
}

export class TokenStandardService {
    constructor(
        private ledgerClient: LedgerClient,
        private scanProxyClient: ScanProxyClient,
        private readonly logger: Logger,
        private accessToken: string,
        private readonly isMasterUser: boolean
    ) {}

    private getTokenStandardClient(registryUrl: string): TokenStandardClient {
        return new TokenStandardClient(
            registryUrl,
            this.logger,
            this.accessToken
        )
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

            const client = this.getTokenStandardClient(registryUrl)

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
        const client = this.getTokenStandardClient(registryUrl)

        const info = await client.get('/registry/metadata/v1/info')

        return info.adminId
    }

    async createAcceptTransferInstruction(
        transferInstructionCid: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(registryUrl)
            const choiceContext = await client.post(
                '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/accept',
                {},
                {
                    path: {
                        transferInstructionId: transferInstructionCid,
                    },
                }
            )

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

    async createRejectTransferInstruction(
        transferInstructionCid: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(registryUrl)
            const choiceContext = await client.post(
                '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/reject',
                {},
                {
                    path: {
                        transferInstructionId: transferInstructionCid,
                    },
                }
            )

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

    async createWithdrawTransferInstruction(
        transferInstructionCid: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(registryUrl)

            const choiceContext = await client.post(
                '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/withdraw',
                {},
                {
                    path: {
                        transferInstructionId: transferInstructionCid,
                    },
                }
            )

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

    async createAllocationInstruction(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        registryUrl: string,
        inputUtxos?: string[],
        requestedAt?: string,
        extraContext?: AllocationContextValue
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
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

        const inputHoldingCids = await this.getInputHoldingsCids(
            allocationSpecificationNormalized.transferLeg.sender,
            inputUtxos
        )

        const choiceArgs: AllocationFactory_Allocate = {
            expectedAdmin: expectedAdmin,
            allocation: allocationSpecificationNormalized,
            requestedAt: requestedAt ?? new Date().toISOString(),
            inputHoldingCids,
            extraArgs: {
                context: { values: { ...(extraContext ?? {}) } },
                meta: { values: {} },
            },
        }

        const allocationFactory = await this.getTokenStandardClient(
            registryUrl
        ).post('/registry/allocation-instruction/v1/allocation-factory', {
            choiceArguments: choiceArgs as unknown as Record<string, never>,
        })

        choiceArgs.extraArgs.context = {
            ...allocationFactory.choiceContext.choiceContextData,
            values:
                allocationFactory.choiceContext.choiceContextData?.values ?? {},
        }

        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_FACTORY_INTERFACE_ID,
            contractId: allocationFactory.factoryId,
            choice: 'AllocationFactory_Allocate',
            choiceArgument: choiceArgs,
        }

        return [exercise, allocationFactory.choiceContext.disclosedContracts]
    }
    async getAllocationExecuteTransferChoiceContext(
        allocationId: string,
        registryUrl: string
    ) {
        return this.getTokenStandardClient(registryUrl).post(
            '/registry/allocations/v1/{allocationId}/choice-contexts/execute-transfer',
            {},
            {
                path: {
                    allocationId,
                },
            }
        )
    }

    async createExecuteTransferAllocation(
        allocationCid: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const choiceContext =
                await this.getAllocationExecuteTransferChoiceContext(
                    allocationCid,
                    registryUrl
                )

            const exercise: ExerciseCommand = {
                templateId: ALLOCATION_INTERFACE_ID,
                contractId: allocationCid,
                choice: 'Allocation_ExecuteTransfer',
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
                'Failed to create allocation execute transfer:',
                e
            )
            throw e
        }
    }

    async createWithdrawAllocation(
        allocationCid: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(registryUrl)

            const choiceContext = await client.post(
                '/registry/allocations/v1/{allocationId}/choice-contexts/withdraw',
                {},
                {
                    path: {
                        allocationId: allocationCid,
                    },
                }
            )

            const exercise: ExerciseCommand = {
                templateId: ALLOCATION_INTERFACE_ID,
                contractId: allocationCid,
                choice: 'Allocation_Withdraw',
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }

            return [exercise, choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error('Failed to create withdraw allocation:', e)
            throw e
        }
    }

    async createCancelAllocation(
        allocationCid: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(registryUrl)

            const choiceContext = await client.post(
                '/registry/allocations/v1/{allocationId}/choice-contexts/cancel',
                {},
                {
                    path: {
                        allocationId: allocationCid,
                    },
                }
            )

            const exercise: ExerciseCommand = {
                templateId: ALLOCATION_INTERFACE_ID,
                contractId: allocationCid,
                choice: 'Allocation_Cancel',
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

    async createWithdrawAllocationInstruction(
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_INSTRUCTION_INTERFACE_ID,
            contractId: registryUrl,
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

    // <T> is shape of viewValue related to queried interface.
    // i.e. when querying by TransferInstruction interfaceId, <T> would be TransferInstructionView from daml codegen
    async listContractsByInterface<T = ViewValue>(
        interfaceId: string,
        partyId?: PartyId
    ): Promise<PrettyContract<T>[]> {
        try {
            const ledgerEnd = await this.ledgerClient.get(
                '/v2/state/ledger-end'
            )
            const acsResponses: JsGetActiveContractsResponse[] =
                await this.ledgerClient.post('/v2/state/active-contracts', {
                    filter: TransactionFilterBySetup(interfaceId, {
                        isMasterUser: this.isMasterUser,
                        partyId: partyId,
                    }),
                    verbose: false,
                    activeAtOffset: ledgerEnd.offset,
                })

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

    async listHoldingTransactions(
        partyId: PartyId,
        afterOffset?: string,
        beforeOffset?: string
    ): Promise<PrettyTransactions> {
        try {
            this.logger.debug('Set or query offset')
            const afterOffsetOrLatest =
                Number(afterOffset) ||
                (await this.ledgerClient.get('/v2/state/latest-pruned-offsets'))
                    .participantPrunedUpToInclusive
            const beforeOffsetOrLatest =
                Number(beforeOffset) ||
                (await this.ledgerClient.get('/v2/state/ledger-end')).offset

            this.logger.debug(afterOffsetOrLatest, 'Using offset')
            const updatesResponse: JsGetUpdatesResponse[] =
                await this.ledgerClient.post('/v2/updates/flats', {
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

            return this.toPrettyTransactions(
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

        const getTransactionResponse = await this.ledgerClient.post(
            '/v2/updates/transaction-by-id',
            {
                updateId,
                transactionFormat,
            }
        )

        return this.toPrettyTransaction(
            getTransactionResponse,
            partyId,
            this.ledgerClient
        )
    }

    private async getInputHoldingsCids(sender: PartyId, inputUtxos?: string[]) {
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

    async createDelegateProxyTranfser(
        sender: PartyId,
        receiver: PartyId,
        exchangeParty: PartyId,
        amount: string,
        instrumentAdmin: PartyId, // TODO (#907): replace with registry call
        instrumentId: string,
        registryUrl: string,
        featuredAppRightCid: string,
        proxyCid: string,
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Record<string, unknown>
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const inputHoldingCids: string[] = await this.getInputHoldingsCids(
            sender,
            inputUtxos
        )

        const [transferCommand, disclosedContracts] = await this.createTransfer(
            sender,
            receiver,
            amount,
            instrumentAdmin,
            instrumentAdmin,
            registryUrl,
            inputUtxos,
            memo,
            expiryDate,
            meta
        )

        const choiceArgs = {
            cid: transferCommand.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries: [
                    {
                        beneficiary: exchangeParty,
                        weight: 1.0,
                    },
                ],
                choiceArg: {
                    expectedAdmin: instrumentAdmin,
                    transfer: {
                        sender,
                        receiver,
                        amount,
                        inputHoldingCids,
                        instrumentId: {
                            admin: instrumentAdmin,
                            id: instrumentId,
                        },
                        // lock: null,
                        requestedAt: new Date(
                            Date.now() - 60 * 1000
                        ).toISOString(),
                        //given expiryDate or 24 hours
                        executeBefore: (
                            expiryDate ??
                            new Date(Date.now() + 24 * 60 * 60 * 1000)
                        ).toISOString(),
                        // inputUtxos,
                        meta: {
                            values: {
                                ['splice.lfdecentralizedtrust.org/reason']:
                                    memo || '',
                                ...meta,
                            },
                        },
                    },
                    extraArgs: {
                        context: { values: {} },
                        meta: { values: {} },
                    },
                },
            },
        }

        // const transferFactory = await this.getTokenStandardClient(
        //     registryUrl
        // ).post('/registry/transfer-instruction/v1/transfer-factory', {
        //     choiceArguments: choiceArgs as unknown as Record<string, never>,
        // })

        // this.logger.debug(transferFactory, 'Transfer factory created')

        // choiceArgs.extraArgs.context = {
        //     ...transferFactory.choiceContext.choiceContextData,
        //     values:
        //         transferFactory.choiceContext.choiceContextData?.values ?? {},
        // }

        const exercise: ExerciseCommand = {
            templateId:
                '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
            contractId: proxyCid,
            choice: 'DelegateProxy_TransferFactory_Transfer',
            choiceArgument: choiceArgs,
        }

        return [exercise, disclosedContracts]
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
        meta?: Record<string, unknown>
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const inputHoldingCids: string[] = await this.getInputHoldingsCids(
                sender,
                inputUtxos
            )

            const choiceArgs = {
                expectedAdmin: instrumentAdmin,
                transfer: {
                    sender,
                    receiver,
                    amount,
                    instrumentId: { admin: instrumentAdmin, id: instrumentId },
                    lock: null,
                    requestedAt: new Date(Date.now() - 60 * 1000).toISOString(),
                    //given expiryDate or 24 hours
                    executeBefore: (
                        expiryDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000)
                    ).toISOString(),
                    inputHoldingCids,
                    meta: { values: { [MEMO_KEY]: memo || '', ...meta } },
                },
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            }

            this.logger.debug('Creating transfer factory...')

            const transferFactory = await this.getTokenStandardClient(
                registryUrl
            ).post('/registry/transfer-instruction/v1/transfer-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
            })

            this.logger.debug(transferFactory, 'Transfer factory created')

            choiceArgs.extraArgs.context = {
                ...transferFactory.choiceContext.choiceContextData,
                values:
                    transferFactory.choiceContext.choiceContextData?.values ??
                    {},
            }

            const exercise: ExerciseCommand = {
                templateId: TRANSFER_FACTORY_INTERFACE_ID,
                contractId: transferFactory.factoryId,
                choice: 'TransferFactory_Transfer',
                choiceArgument: choiceArgs,
            }

            return [exercise, transferFactory.choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error('Failed to execute transfer:', e)
            throw e
        }
    }

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
                requestedAt: now.toISOString(),
                executeBefore: tomorrow.toISOString(),
                inputHoldingCids: [],
                meta: { values: {} },
            },
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }

        const transferFactory = await this.getTokenStandardClient(
            registryUrl
        ).post('/registry/transfer-instruction/v1/transfer-factory', {
            choiceArguments: choiceArgs as unknown as Record<string, never>,
        })

        const disclosedContracts =
            transferFactory.choiceContext.disclosedContracts

        const amuletRules = await this.scanProxyClient.getAmuletRules()
        const openMiningRounds =
            await this.scanProxyClient.getOpenMiningRounds()
        if (!amuletRules) {
            throw new Error('AmuletRules contract not found')
        }

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
                    receiver: receiver,
                    amount: amount,
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
            synchronizerId: synchronizerId,
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

    private async toPrettyTransactionsPerParty(
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

    private async toPrettyTransactions(
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

    private async toPrettyTransaction(
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
}
