import { TokenStandardClient } from '@splice/core-token-standard'
import { Logger } from '@splice/core-types'
import { LedgerClient } from './ledger-client'
import {
    HoldingInterface,
    InterfaceId,
    TokenStandardTransactionInterfaces,
    TransferInstructionInterface,
} from './constants'
import { components } from './generated-clients/openapi-3.3.0-SNAPSHOT.js'
import {
    Completion,
    filtersByParty,
    submitExerciseCommand,
} from './ledger-api-utils'

type ExerciseCommand = components['schemas']['ExerciseCommand']
type JsGetActiveContractsResponse =
    components['schemas']['JsGetActiveContractsResponse']
type JsGetUpdatesResponse = components['schemas']['JsGetUpdatesResponse']

interface AcceptTransferInstructionCommandOptions {
    // paths to keys
    publicKey: string
    privateKey: string
    transferFactoryRegistryUrl: string
    party: string
    userId: string
}

interface TransferCommandOptions {
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

    async acceptTransferInstruction(
        transferInstructionCid: string,
        opts: AcceptTransferInstructionCommandOptions
    ): Promise<void> {
        try {
            const {
                privateKey,
                publicKey,
                party,
                userId,
                transferFactoryRegistryUrl,
            } = opts

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

            const completion = await submitExerciseCommand(
                this.ledgerClient,
                exercise,
                choiceContext.disclosedContracts,
                party,
                userId,
                publicKey,
                privateKey
            )
            const result = { ...completion, status: 'success' }

            console.log(JSON.stringify(result, null, 2))
        } catch (e) {
            console.error('Failed to accept transfer instruction:', e)
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
            console.error(
                `Failed to list contracts of interface ${interfaceId.toString()}`,
                err
            )
            throw err
        }
    }

    async listHoldingTransactions(
        partyId: string,
        opts: {
            afterOffset?: string
        }
    ): Promise<JsGetUpdatesResponse[]> {
        try {
            const afterOffsetOrLatest =
                Number(opts.afterOffset) ||
                (await this.ledgerClient.get('/v2/state/latest-pruned-offsets'))
                    .participantPrunedUpToInclusive
            const updates = await this.ledgerClient.post('/v2/updates/flats', {
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
                        transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                    },
                },
                beginExclusive: afterOffsetOrLatest,
                verbose: false,
            })
            return updates
        } catch (err) {
            console.error('Failed to list holding transactions.', err)
            throw err
        }
    }

    async transfer(opts: TransferCommandOptions): Promise<Completion> {
        try {
            const {
                sender,
                receiver,
                amount,
                privateKey,
                publicKey,
                userId,
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
            const completion = await submitExerciseCommand(
                this.ledgerClient,
                exercise,
                transferFactory.choiceContext.disclosedContracts,
                sender,
                userId,
                publicKey,
                privateKey
            )
            return completion
        } catch (e) {
            console.error('Failed to execute transfer:', e)
            throw e
        }
    }
}
