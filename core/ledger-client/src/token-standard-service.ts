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
import {
    ensureInterfaceViewIsPresent,
    filtersByParty,
} from './ledger-api-utils.js'
import { TransactionParser } from './txparse/parser.js'
import { PrettyContract, renderTransaction } from './txparse/types.js'

import type { PrettyTransactions, Transaction } from './txparse/types.js'

type ExerciseCommand = components['schemas']['ExerciseCommand']
type JsGetActiveContractsResponse =
    components['schemas']['JsGetActiveContractsResponse']
type JsGetUpdatesResponse = components['schemas']['JsGetUpdatesResponse']
type OffsetCheckpoint2 = components['schemas']['OffsetCheckpoint2']
type JsTransaction = components['schemas']['JsTransaction']
type ViewValue = components['schemas']['JsInterfaceView']['viewValue']

type OffsetCheckpointUpdate = {
    update: { OffsetCheckpoint: OffsetCheckpoint2 }
}
type TransactionUpdate = {
    update: { Transaction: { value: JsTransaction } }
}
type JsActiveContractEntryResponse = JsGetActiveContractsResponse & {
    contractEntry: {
        JsActiveContract: {
            createdEvent: components['schemas']['CreatedEvent']
        }
    }
}

interface CreateTransferOptions {
    sender: string
    receiver: string
    amount: string
    // paths to keys
    publicKey: string
    privateKey: string
    instrumentAdmin: string // TODO (#907): replace with registry call
    instrumentId: string
    transferFactoryRegistryUrl: string
    userId: string
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

    // <T> is shape of viewValue related to queried interface.
    // i.e. when querying by TransferInstruction interfaceId, <T> would be TransferInstructionView from daml codegen
    async listContractsByInterface<T = ViewValue>(
        interfaceId: InterfaceId,
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
                while leaving JsActiveContract
                Those removed entries should not affect returned contracts output, nor trigger error
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
        opts: CreateTransferOptions
    ): Promise<ExerciseCommand> {
        try {
            const {
                sender,
                receiver,
                amount,
                instrumentAdmin,
                instrumentId,
                transferFactoryRegistryUrl,
            } = opts

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
            return exercise
        } catch (e) {
            this.logger.error('Failed to execute transfer:', e)
            throw e
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

    // Make them nicer to show by excluding stuff useless to users such as the createdEventBlob
    private toPrettyContract<T>(
        interfaceId: InterfaceId,
        response: JsActiveContractEntryResponse
    ): PrettyContract<T> {
        const createdEvent =
            response.contractEntry.JsActiveContract.createdEvent
        return {
            contractId: createdEvent.contractId,
            payload: ensureInterfaceViewIsPresent(createdEvent, interfaceId)
                .viewValue as T,
        }
    }
}
