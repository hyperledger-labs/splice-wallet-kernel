// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TokenStandardClient } from '@canton-network/core-token-standard'
import { Logger } from '@canton-network/core-types'
import { LedgerClient } from './ledger-client.js'
import {
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

type ExerciseCommand = Types['ExerciseCommand']
type JsGetActiveContractsResponse = Types['JsGetActiveContractsResponse']
type JsGetUpdatesResponse = Types['JsGetUpdatesResponse']
type OffsetCheckpoint2 = Types['OffsetCheckpoint2']
type JsTransaction = Types['JsTransaction']

type OffsetCheckpointUpdate = {
    update: { OffsetCheckpoint: OffsetCheckpoint2 }
}
type TransactionUpdate = {
    update: { Transaction: { value: JsTransaction } }
}
type DisclosedContract = Types['DisclosedContract']

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
        private readonly logger: Logger
    ) {}

    private tokenStandardClient(registryUrl: string): TokenStandardClient {
        return new TokenStandardClient(registryUrl, this.logger, undefined)
    }

    async createAcceptTransferInstruction(
        transferInstructionCid: string,
        transferFactoryRegistryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.tokenStandardClient(transferFactoryRegistryUrl)
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
        const client = this.tokenStandardClient(transferFactoryRegistryUrl)

        const info = await client.get('/registry/metadata/v1/info')

        return info.adminId
    }

    async createRejectTransferInstruction(
        transferInstructionCid: string,
        transferFactoryRegistryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const client = this.tokenStandardClient(transferFactoryRegistryUrl)
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

    // <T> is shape of viewValue related to queried interface.
    // i.e. when querying by TransferInstruction interfaceId, <T> would be TransferInstructionView from daml codegen
    async listContractsByInterface<T = ViewValue>(
        interfaceId: string,
        partyId: string
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
        partyId: string,
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

    async createTransfer(
        sender: string,
        receiver: string,
        amount: string,
        instrumentAdmin: string, // TODO (#907): replace with registry call
        instrumentId: string,
        transferFactoryRegistryUrl: string,
        meta?: Record<string, never>
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const ledgerEndOffset = await this.ledgerClient.get(
                '/v2/state/ledger-end'
            )
            //TODO: filter out any holdings that has a non-expired lock
            const senderHoldings = await this.ledgerClient.post(
                '/v2/state/active-contracts',
                {
                    filter: {
                        filtersByParty: filtersByParty(
                            sender,
                            [HoldingInterface],
                            false
                        ),
                    },
                    verbose: false,
                    activeAtOffset: ledgerEndOffset.offset,
                }
            )
            if (senderHoldings.length === 0) {
                throw new Error(
                    "Sender has no holdings, so transfer can't be executed."
                )
            }
            const holdings = senderHoldings.map(
                (h) => h['contractEntry']['JsActiveContract']
            )
            const inputHoldingCids = holdings
                .filter((h) => h !== undefined)
                .map((h) => h['createdEvent']['contractId'])

            const now = new Date()
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const choiceArgs = {
                expectedAdmin: instrumentAdmin,
                transfer: {
                    sender,
                    receiver,
                    amount,
                    instrumentId: { admin: instrumentAdmin, id: instrumentId },
                    lock: null,
                    requestedAt: now.toISOString(),
                    executeBefore: tomorrow.toISOString(),
                    inputHoldingCids,
                    meta: { values: meta || {} },
                },
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            }

            this.logger.debug('Creating transfer factory...')

            const transferFactory = await this.tokenStandardClient(
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
        // TODO: replace with correct scan lookup
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

        const transferFactory = await this.tokenStandardClient(
            transferFactoryRegistryUrl
        ).post('/registry/transfer-instruction/v1/transfer-factory', {
            choiceArguments: choiceArgs as unknown as Record<string, never>,
        })

        const disclosedContracts =
            transferFactory.choiceContext.disclosedContracts

        const amuletRules = disclosedContracts.find((c) =>
            c.templateId?.endsWith('Splice.AmuletRules:AmuletRules')
        )
        if (!amuletRules) {
            throw new Error('AmuletRules contract not found')
        }
        const openMiningRounds = disclosedContracts.find((c) =>
            c.templateId?.endsWith('Splice.Round:OpenMiningRound')
        )
        if (!openMiningRounds) {
            throw new Error('OpenMiningRound contract not found')
        }
        return [
            {
                templateId: amuletRules.templateId!,
                contractId: amuletRules.contractId,
                choice: 'AmuletRules_DevNet_Tap',
                choiceArgument: {
                    receiver: receiver,
                    amount: amount,
                    openRound: openMiningRounds.contractId,
                },
            },
            disclosedContracts,
        ]
    }

    private async toPrettyTransactions(
        updates: JsGetUpdatesResponse[],
        partyId: string,
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
            interfaceViewValue: ensureInterfaceViewIsPresent(
                createdEvent,
                interfaceId
            ).viewValue as T,
        }
    }
}
