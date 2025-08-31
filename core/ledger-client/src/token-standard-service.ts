import { TokenStandardClient } from '@canton-network/core-token-standard'
import { Logger } from '@canton-network/core-types'
import { LedgerClient } from './ledger-client.js'
import {
    HoldingInterface,
    InterfaceId,
    TokenStandardTransactionInterfaces,
    TransferInstructionInterface,
} from './constants.js'
import { components } from './generated-clients/openapi-3.3.0-SNAPSHOT.js'
import { filtersByParty } from './ledger-api-utils.js'
import { TransactionParser } from './txparse/parser.js'
import { renderTransaction } from './txparse/types.js'

import type { PrettyTransactions, Transaction } from './txparse/types.js'

type ExerciseCommand = components['schemas']['ExerciseCommand']
type JsGetActiveContractsResponse =
    components['schemas']['JsGetActiveContractsResponse']
type JsGetUpdatesResponse = components['schemas']['JsGetUpdatesResponse']
type OffsetCheckpoint2 = components['schemas']['OffsetCheckpoint2']
type JsTransaction = components['schemas']['JsTransaction']
type OffsetCheckpointUpdate = {
    update: { OffsetCheckpoint: OffsetCheckpoint2 }
}
type TransactionUpdate = {
    update: { Transaction: { value: JsTransaction } }
}
type DisclosedContract = components['schemas']['DisclosedContract']

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
    ): Promise<ExerciseCommand> {
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
                templateId: TransferInstructionInterface.toString(),
                contractId: transferInstructionCid,
                choice: 'TransferInstruction_Accept',
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }

            return exercise
        } catch (e) {
            this.logger.error(
                'Failed to create accept transfer instruction:',
                e
            )
            throw e
        }
    }

    async listContractsByInterface(
        interfaceId: InterfaceId,
        partyId: string
    ): Promise<JsGetActiveContractsResponse[]> {
        try {
            const ledgerEnd = await this.ledgerClient.get(
                '/v2/state/ledger-end'
            )
            const responses = await this.ledgerClient.post(
                '/v2/state/active-contracts',
                {
                    filter: {
                        filtersByParty: filtersByParty(
                            partyId,
                            [interfaceId],
                            false
                        ),
                    },
                    verbose: false,
                    activeAtOffset: ledgerEnd.offset,
                }
            )
            return responses
        } catch (err) {
            this.logger.error(
                `Failed to list contracts of interface ${interfaceId.toString()}`,
                err
            )
            throw err
        }
    }

    async listHoldingTransactions(
        partyId: string,
        afterOffset?: string
    ): Promise<PrettyTransactions> {
        try {
            this.logger.debug('Set or query offset')
            const afterOffsetOrLatest =
                Number(afterOffset) ||
                (await this.ledgerClient.get('/v2/state/latest-pruned-offsets'))
                    .participantPrunedUpToInclusive
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
            // if (senderHoldings.length === 0) {
            //     throw new Error(
            //         "Sender has no holdings, so transfer can't be executed."
            //     )
            // }
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

            this.logger.info('Creating transfer factory...')

            const transferFactory = await this.tokenStandardClient(
                transferFactoryRegistryUrl
            ).post('/registry/transfer-instruction/v1/transfer-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
            })

            this.logger.info('Transfer factory created:', transferFactory)

            choiceArgs.extraArgs.context = {
                ...transferFactory.choiceContext.choiceContextData,
                values:
                    transferFactory.choiceContext.choiceContextData?.values ??
                    {},
            }

            const exercise: ExerciseCommand = {
                // todo: use codegen
                templateId:
                    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory',
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

    // TODO: replace with scan lookup
    createTap(
        contracts: DisclosedContract[],
        receiver: string,
        amount: string
    ): ExerciseCommand {
        const amuletRules = contracts.find((c) =>
            c.templateId?.endsWith('Splice.AmuletRules:AmuletRules')
        )
        if (!amuletRules) {
            throw new Error('AmuletRules contract not found')
        }
        const openMiningRounds = contracts.find((c) =>
            c.templateId?.endsWith('Splice.Round:OpenMiningRound')
        )
        if (!openMiningRounds) {
            throw new Error('OpenMiningRound contract not found')
        }
        return {
            templateId: amuletRules.templateId!,
            contractId: amuletRules.contractId,
            choice: 'AmuletRules_DevNet_Tap',
            choiceArgument: {
                receiver: receiver,
                amount: amount,
                openRound: openMiningRounds.contractId,
            },
        }
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
}
