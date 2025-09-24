// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    TokenStandardClient,
    HoldingView,
} from '@canton-network/core-token-standard'
import { Logger, PartyId } from '@canton-network/core-types'
import { LedgerClient } from './ledger-client.js'
import {
    AllocationFactoryInterface,
    AllocationInterface,
    HoldingInterface,
    TokenStandardTransactionInterfaces,
    TransferFactoryInterface,
    TransferInstructionInterface,
} from './constants.js'
import {
    ensureInterfaceViewIsPresent,
    filtersByParty,
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
        private accessToken: string
    ) {}

    // TODO group methods below. with allocations it will get pretty long

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

    async getInstrumentById(
        transferFactoryRegistryUrl: string,
        instrumentId: string
    ) {
        try {
            const params: Record<string, unknown> = {
                path: {
                    instrumentId,
                },
            }

            const client = this.getTokenStandardClient(
                transferFactoryRegistryUrl
            )

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

    async createAcceptTransferInstruction(
        transferInstructionCid: string,
        transferFactoryRegistryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(
                transferFactoryRegistryUrl
            )
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
                templateId: TransferInstructionInterface,
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

    async getInstrumentAdmin(
        transferFactoryRegistryUrl: string
    ): Promise<string | undefined> {
        const client = this.getTokenStandardClient(transferFactoryRegistryUrl)

        const info = await client.get('/registry/metadata/v1/info')

        return info.adminId
    }

    async createRejectTransferInstruction(
        transferInstructionCid: string,
        transferFactoryRegistryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(
                transferFactoryRegistryUrl
            )
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
                templateId: TransferInstructionInterface,
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
        transferFactoryRegistryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(
                transferFactoryRegistryUrl
            )

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
                templateId: TransferInstructionInterface,
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

    // TODO that naming seems off
    async createExecuteTransferAllocation(
        allocationCid: string,
        allocationFactoryRegistryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(
                allocationFactoryRegistryUrl
            )

            const choiceContext = await client.post(
                '/registry/allocations/v1/{allocationId}/choice-contexts/execute-transfer',
                {},
                {
                    path: {
                        allocationId: allocationCid,
                    },
                }
            )

            const exercise: ExerciseCommand = {
                templateId: AllocationInterface,
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
        allocationFactoryRegistryUrl: string // TODO those are not actually factories, rename all to avoid confusion
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(
                allocationFactoryRegistryUrl
            )

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
                templateId: AllocationInterface,
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
        allocationFactoryRegistryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.getTokenStandardClient(
                allocationFactoryRegistryUrl
            )

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
                templateId: AllocationInterface,
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

    // <T> is shape of viewValue related to queried interface.
    // i.e. when querying by TransferInstruction interfaceId, <T> would be TransferInstructionView from daml codegen
    async listContractsByInterface<T = ViewValue>(
        interfaceId: string,
        partyId: PartyId
    ): Promise<PrettyContract<T>[]> {
        try {
            const ledgerEnd = await this.ledgerClient.get(
                '/v2/state/ledger-end'
            )
            const acsResponses: JsGetActiveContractsResponse[] =
                await this.ledgerClient.post('/v2/state/active-contracts', {
                    filter: {
                        filtersByParty: filtersByParty(
                            partyId,
                            [interfaceId],
                            false
                        ),
                    },
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
                            eventFormat: {
                                filtersByParty: filtersByParty(
                                    partyId,
                                    TokenStandardTransactionInterfaces,
                                    true
                                ),
                                verbose: false,
                            },
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
        const filter = filtersByParty(
            partyId,
            TokenStandardTransactionInterfaces,
            true
        )

        const transactionFormat: TransactionFormat = {
            eventFormat: {
                filtersByParty: filter,
                verbose: false,
            },
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

    async createTransfer(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId, // TODO (#907): replace with registry call
        instrumentId: string,
        transferFactoryRegistryUrl: string,
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Record<string, unknown>
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            let inputHoldingCids: string[]
            const now = new Date()

            if (inputUtxos && inputUtxos.length > 0) {
                inputHoldingCids = inputUtxos
            } else {
                const senderHoldings =
                    await this.listContractsByInterface<HoldingView>(
                        HoldingInterface,
                        sender
                    )
                if (senderHoldings.length === 0) {
                    throw new Error(
                        "Sender has no holdings, so transfer can't be executed."
                    )
                }

                inputHoldingCids = senderHoldings
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
            const choiceArgs = {
                expectedAdmin: instrumentAdmin,
                transfer: {
                    sender,
                    receiver,
                    amount,
                    instrumentId: { admin: instrumentAdmin, id: instrumentId },
                    lock: null,
                    requestedAt: now.toISOString(),
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
                transferFactoryRegistryUrl
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
                templateId: TransferFactoryInterface,
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
        transferFactoryRegistryUrl: string
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
            transferFactoryRegistryUrl
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

    async createAllocationInstruction(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId,
        instrumentId: string,
        allocationFactoryRegistryUrl: string,
        executor: PartyId,
        inputUtxos?: string[],
        memo?: string,
        meta?: Record<string, unknown>, // goes into transferLeg.meta TODO maybe rename?
        settlementMeta?: Record<string, unknown>,
        allocateBefore?: Date,
        settleBefore?: Date,
        transferLegId?: string,
        settlementRefId?: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            let inputHoldingCids: string[]
            const now = new Date()

            if (inputUtxos && inputUtxos.length > 0) {
                inputHoldingCids = inputUtxos
            } else {
                const senderHoldings =
                    await this.listContractsByInterface<HoldingView>(
                        HoldingInterface,
                        sender
                    )

                if (senderHoldings.length === 0) {
                    throw new Error(
                        "Sender has no holdings, so allocation can't be executed."
                    )
                }

                inputHoldingCids = senderHoldings
                    .filter((utxo) => {
                        // filter locked holdings
                        const lock = utxo.interfaceViewValue.lock
                        if (!lock) return true
                        const expiresAt = lock.expiresAt
                        if (!expiresAt) return false
                        return new Date(expiresAt) <= now
                    })
                    .map((h) => h.contractId)
                // TODO same as transfer: optimize input selection to avoid over-consuming inputs.
            }

            const allocBefore = (
                allocateBefore ?? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            ).toISOString()
            const settleBef = (
                settleBefore ??
                new Date(new Date(allocBefore).getTime() + 24 * 60 * 60 * 1000)
            ).toISOString()

            const settlementRef = { id: settlementRefId ?? '' }

            const choiceArgs = {
                expectedAdmin: instrumentAdmin,
                allocation: {
                    settlement: {
                        executor,
                        settlementRef,
                        requestedAt: now.toISOString(),
                        allocateBefore: allocBefore,
                        settleBefore: settleBef,
                        meta: { values: { ...(settlementMeta ?? {}) } },
                    },
                    transferLegId: transferLegId ?? `leg-${Date.now()}`,
                    transferLeg: {
                        sender,
                        receiver,
                        amount,
                        instrumentId: {
                            admin: instrumentAdmin,
                            id: instrumentId,
                        },
                        meta: {
                            values: { [MEMO_KEY]: memo || '', ...(meta ?? {}) },
                        },
                    },
                },
                requestedAt: now.toISOString(),
                inputHoldingCids,
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            }

            this.logger.debug('Creating allocation factory...')

            const allocationFactory = await this.getTokenStandardClient(
                allocationFactoryRegistryUrl
            ).post('/registry/allocation-instruction/v1/allocation-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
            })

            this.logger.debug(allocationFactory, 'Allocation factory created')

            // Merge returned choice-context
            choiceArgs.extraArgs.context = {
                ...allocationFactory.choiceContext.choiceContextData,
                values:
                    allocationFactory.choiceContext.choiceContextData?.values ??
                    {},
            }

            const exercise: ExerciseCommand = {
                templateId: AllocationFactoryInterface,
                contractId: allocationFactory.factoryId,
                choice: 'AllocationFactory_Allocate',
                choiceArgument: choiceArgs,
            }

            return [
                exercise,
                allocationFactory.choiceContext.disclosedContracts,
            ]
        } catch (e) {
            this.logger.error('Failed to create allocation instruction:', e)
            throw e
        }
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
                        partyId
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
        const parser = new TransactionParser(tx, ledgerClient, partyId)
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
