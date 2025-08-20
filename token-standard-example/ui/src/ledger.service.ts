import {
    TokenTransferFactory,
    TokenTransferInstruction,
} from '@daml.js/exercise-app/lib/TokenTransfer'
import { MetadataV1 } from '@daml.js/token-standard-metadata/lib/Splice/Api/Token'
import {
    TransferFactory,
    TransferFactory_Transfer,
    TransferInstruction,
    TransferInstruction_Update,
    Transfer,
} from '@daml.js/token-standard-transfer-instruction/lib/Splice/Api/Token/TransferInstructionV1'
import { TokenHolding } from '@daml.js/exercise-app/lib/TokenHolding'
import { GetResponse, PostRequest, PostResponse } from 'core-ledger-client'
import { LedgerClient } from 'core-ledger-client'
import pino from 'pino'

const logger = pino({ name: 'token-standard-example', level: 'debug' })
import { RegistryService } from './registry.service'

const PROXY_URL = 'http://localhost:8000/'
const REGISTRY_SERVICE_URL = 'http://localhost:8002/'

// const PROXY_URL = 'http://localhost:8000/'

export function createLedgerApiClient(authToken: string): LedgerClient {
    return new LedgerClient(PROXY_URL, authToken, logger)
}

export interface ITokenHolding {
    contractId: string
    owner: string
    dso: string
    amount: string
    instrumentId: {
        admin: string
        id: string
    }
    meta: {
        values: Record<string, unknown>
    }
}

export interface ITokenTransferFactory {
    contractId: string
    admin: string
    observers: string[]
    meta: {
        values: Record<string, unknown>
    }
}

export interface ITokenTransferInstruction {
    contractId: string
    transfer: Transfer
}

export class LedgerService {
    private constructor(
        public readonly login: string,
        private readonly ledgerClient: LedgerClient,
        private readonly registryService: RegistryService
    ) {}

    public userId?: string
    public party?: string

    static async create(
        login: string,
        sessionToken: string
    ): Promise<LedgerService> {
        const client = createLedgerApiClient(sessionToken)
        const registryService = new RegistryService(REGISTRY_SERVICE_URL)
        const svc = new LedgerService(login, client, registryService)
        await svc.init(login)
        return svc
    }

    public get isOperator() {
        return Boolean(this.party && this.party.startsWith('operator:'))
    }

    private async getUserById(
        userId: string
    ): Promise<GetResponse<'/v2/users/{user-id}'>> {
        return this.ledgerClient.get('/v2/users/{user-id}', {
            path: { 'user-id': userId },
        })
    }

    private async init(login: string): Promise<void> {
        const partiesThatCanBeActedAs = await this.fetchRightToActAsParty()
        const loginMatchingPartyRight = partiesThatCanBeActedAs.find((right) =>
            // @ts-expect-error reason tbs
            right?.kind?.CanActAs?.value?.party?.startsWith?.(login)
        )
        // @ts-expect-error reason tbs
        if (loginMatchingPartyRight?.kind?.CanActAs?.value?.party) {
            this.userId = 'operator'
            // @ts-expect-error reason tbs
            this.party = loginMatchingPartyRight.kind.CanActAs.value.party
        } else {
            throw new Error(`No right to act as party ${login}`)
        }
    }

    private async fetchRightToActAsParty() {
        const rights = await this.ledgerClient.get(
            '/v2/users/{user-id}/rights',
            {
                path: {
                    'user-id': 'operator',
                },
            }
        )

        // TODO add null checks
        // @ts-expect-error reason tbs
        return rights.rights.filter((right) => 'CanActAs' in right.kind)
    }

    public async fetchParties() {
        // TODO error handling
        const actAsRights = await this.fetchRightToActAsParty()
        // @ts-expect-error reason tbs
        return actAsRights.map((right) => right?.kind?.CanActAs?.value?.party)
    }

    private mapTransferFactoriesResponseData(
        response: PostResponse<'/v2/state/active-contracts'>
    ): ITokenTransferFactory[] {
        return response
            .map((entry) => {
                const event =
                    entry?.contractEntry?.JsActiveContract?.createdEvent
                if (!event || !event?.createArgument) return null

                interface ITransferFactoryCreateArgument {
                    admin: string
                    observers: string[]
                    meta: {
                        values: Record<string, unknown>
                    }
                }

                const arg =
                    event?.createArgument as ITransferFactoryCreateArgument

                return {
                    contractId: event.contractId,
                    admin: arg?.admin ?? '',
                    observers: arg?.observers ?? [],
                    meta: {
                        values: arg?.meta?.values ?? {},
                    },
                }
            })
            .filter((entry) => entry !== null)
    }

    private mapHoldingsResponseData(
        response: PostResponse<'/v2/state/active-contracts'>
    ): ITokenHolding[] {
        return response
            .map((entry) => {
                const event =
                    entry?.contractEntry?.JsActiveContract?.createdEvent

                interface IHoldingCreateArgument {
                    owner: string
                    dso: string
                    amount: string
                    instrumentId: {
                        admin: string
                        id: string
                    }
                    meta: {
                        values: Record<string, unknown>
                    }
                }

                if (!event || !event?.createArgument) return null
                const arg = event?.createArgument as IHoldingCreateArgument

                return {
                    contractId: event.contractId,
                    owner: arg?.owner ?? '',
                    dso: arg?.dso ?? '',
                    amount: arg?.amount ?? '',
                    instrumentId: {
                        admin: arg?.instrumentId?.admin ?? '',
                        id: arg?.instrumentId?.id ?? '',
                    },
                    meta: {
                        values: arg?.meta?.values ?? {},
                    },
                }
            })
            .filter((entry) => entry !== null)
    }

    private mapTransferInstructionsResponseData(
        response: PostResponse<'/v2/state/active-contracts'>
    ): ITokenTransferInstruction[] {
        return response
            .map((entry) => {
                const event =
                    entry?.contractEntry?.JsActiveContract?.createdEvent

                interface ITransferInstructionCreateArgument {
                    transfer: Transfer
                }

                if (!event || !event?.createArgument) return null
                const arg =
                    event?.createArgument as ITransferInstructionCreateArgument

                return {
                    contractId: event.contractId,
                    transfer: arg.transfer,
                }
            })
            .filter((entry) => entry !== null)
    }

    private getLedgerEnd(): Promise<GetResponse<'/v2/state/ledger-end'>> {
        return this.ledgerClient.get('/v2/state/ledger-end')
    }

    private getActiveContracts(
        req: PostRequest<'/v2/state/active-contracts'>
    ): Promise<PostResponse<'/v2/state/active-contracts'>> {
        return this.ledgerClient.post('/v2/state/active-contracts', req)
    }

    private async fetchActiveContractsByTemplate(templateId?: string) {
        if (!this.party) throw new Error('No defined party')
        if (!templateId) throw new Error('No defined templateId')

        const offsetResponse = await this.getLedgerEnd()
        const { offset } = offsetResponse

        const req: PostRequest<'/v2/state/active-contracts'> = {
            eventFormat: {
                filtersByParty: {
                    [this.party]: {
                        cumulative: [
                            {
                                identifierFilter: {
                                    TemplateFilter: {
                                        value: {
                                            templateId: templateId,
                                            includeCreatedEventBlob: false,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
                verbose: false,
            },
            verbose: false,
            activeAtOffset: offset,
        }
        return this.getActiveContracts(req)
    }

    // public async connectActiveContractsStream(
    //     templateId: string,
    //     party: string
    // ): Promise<WebSocket> {
    //     if (!this.party) throw new Error('No defined party')
    //     if (!templateId) throw new Error('No defined templateId')
    //
    //     const offsetResponse = await this.ledgerClient.getLedgerEnd()
    //     const { offset } = offsetResponse
    //
    //     const wsUrl = PROXY_URL.replace(/^http/, 'ws') + `v2/updates/flats`
    //
    //     const ws = new WebSocket(wsUrl, ['daml.ws.auth', this.authToken])
    //     // window.myWs = ws;
    //
    //     ws.onopen = () => {
    //         console.log('WebSocket connected')
    //
    //         const updatesRequest = {
    //             beginExclusive: offset,
    //             verbose: false,
    //             updateFormat: {
    //                 includeTransactions: {
    //                     eventFormat: {
    //                         filtersByParty: {
    //                             [party]: {
    //                                 cumulative: [
    //                                     {
    //                                         identifierFilter: {
    //                                             TemplateFilter: {
    //                                                 value: {
    //                                                     templateId,
    //                                                     includeCreatedEventBlob:
    //                                                         false,
    //                                                 },
    //                                             },
    //                                         },
    //                                     },
    //                                 ],
    //                             },
    //                         },
    //                         verbose: false,
    //                     },
    //                     transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
    //                 },
    //             },
    //         }
    //
    //         ws.send(JSON.stringify(updatesRequest))
    //     }
    //
    //     ws.onmessage = (event) => {
    //         try {
    //             const msg = JSON.parse(event.data)
    //             console.log('Active contracts stream event:', msg)
    //         } catch (err) {
    //             console.error('Failed to parse stream message', err)
    //         }
    //     }
    //
    //     ws.onerror = (err) => {
    //         console.error('WebSocket error:', err)
    //     }
    //
    //     ws.onclose = (arg) => {
    //         console.log('Active contracts stream closed.', arg)
    //     }
    //
    //     return ws
    // }

    public async fetchHoldings(): Promise<ITokenHolding[]> {
        const response = await this.fetchActiveContractsByTemplate(
            TokenHolding.templateId
        )
        return this.mapHoldingsResponseData(response)
    }

    public async fetchTransfers(): Promise<ITokenTransferInstruction[]> {
        const response = await this.fetchActiveContractsByTemplate(
            TokenTransferInstruction.templateId
        )
        return this.mapTransferInstructionsResponseData(response)
    }

    public async fetchTransferFactories(): Promise<ITokenTransferFactory[]> {
        const response = await this.fetchActiveContractsByTemplate(
            TokenTransferFactory.templateId
        )
        return this.mapTransferFactoriesResponseData(response)
    }

    private async fetchTokenTransferFactory(token: string) {
        const factories = await this.fetchTransferFactories()
        // TODO fix this ugly hack by adding Token to factory metadata in daml script
        const admins = {
            ETH: 'EthAdmin',
            BTC: 'BtcAdmin',
        }

        const factory = factories.find(
            // @ts-expect-error reason TBS
            (f) => f.admin && admins[token] && f.admin.includes(admins[token])
        )

        if (!factory) {
            throw new Error(`TransferFactory for token "${token}" not found`)
        }

        return factory
    }

    private submitAndWaitPost(
        req: PostRequest<'/v2/commands/submit-and-wait'>
    ): Promise<PostResponse<'/v2/commands/submit-and-wait'>> {
        return this.ledgerClient.post('/v2/commands/submit-and-wait', req)
    }
    private submitAndWaitForTransactionPost(
        req: PostRequest<'/v2/commands/submit-and-wait-for-transaction'>
    ): Promise<PostResponse<'/v2/commands/submit-and-wait-for-transaction'>> {
        return this.ledgerClient.post(
            '/v2/commands/submit-and-wait-for-transaction',
            req
        )
    }

    public async createTransfer(
        receiver: string,
        token: string,
        amount: string,
        inputHoldingCids: string[]
    ): Promise<PostResponse<'/v2/commands/submit-and-wait'>> {
        const tokenTransferFactory = await this.fetchTokenTransferFactory(token)

        if (!this.party) {
            throw new Error(`Sender party not found`)
        }

        const emptyMeta: MetadataV1.Metadata = { values: {} }
        const emptyExtraArgs: MetadataV1.ExtraArgs = {
            context: { values: {} },
            meta: emptyMeta,
        }

        const transfer: TransferFactory_Transfer['transfer'] = {
            sender: this.party,
            receiver,
            instrumentId: {
                admin: tokenTransferFactory.admin,
                id: token,
            },
            // @ts-expect-error reason TBS
            inputHoldingCids,
            amount,
            meta: emptyMeta,
            executeBefore: new Date(Date.now() + 10 * 60_000).toISOString(),
            requestedAt: new Date().toISOString(),
        }

        // @ts-expect-error reason TBS
        const requestBody: PostRequest<'/v2/commands/submit-and-wait'> = {
            actAs: [this.party],
            userId: this.userId,
            commandId: crypto.randomUUID(),
            commands: [
                {
                    ExerciseCommand: {
                        templateId: TransferFactory.templateId,
                        contractId: tokenTransferFactory.contractId,
                        choice: TransferFactory.TransferFactory_Transfer
                            .choiceName,
                        choiceArgument: {
                            expectedAdmin: tokenTransferFactory.admin,
                            transfer,
                            extraArgs: emptyExtraArgs,
                        },
                    },
                },
            ],
        }

        return this.submitAndWaitPost(requestBody)
    }

    private async createTransferFactory(
        symbol: string
    ): Promise<PostResponse<'/v2/commands/submit-and-wait-for-transaction'>> {
        type CreateArgs = {
            admin: string // PartyId
            meta: { values: Record<string, string> }
            observers: string[]
        }

        if (!this.party) {
            throw new Error(`Party not found`)
        }

        const args: CreateArgs = {
            admin: this.party,
            meta: { values: { symbol } },
            observers: [],
        }

        const requestBody: PostRequest<'/v2/commands/submit-and-wait-for-transaction'> =
            {
                commands: {
                    actAs: [this.party],
                    userId: this.userId as string,
                    commandId: crypto.randomUUID(),
                    commands: [
                        {
                            CreateCommand: {
                                templateId: TokenTransferFactory.templateId,
                                createArguments: args,
                            },
                        },
                    ],
                    // disclosedContracts: [...]   // if/when you add them
                },
                // Optional, but useful to control what comes back
                transactionFormat: {
                    eventFormat: {
                        filtersByParty: { [this.party]: {} }, // wildcard filter for your party
                        verbose: false,
                    },
                    transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
                },
            }

        return this.submitAndWaitForTransactionPost(requestBody)
    }

    public async createAndRegisterTransferFactory(
        symbol: string
    ): Promise<PostResponse<'/v2/commands/submit-and-wait-for-transaction'>> {
        const response = await this.createTransferFactory(symbol)
        const events = response?.transaction?.events ?? []
        const created = events.find(
            // TODO e doesn't infer type from array
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) =>
                e?.CreatedEvent?.templateId?.endsWith?.(
                    `:TokenTransfer:TokenTransferFactory`
                )
        )?.CreatedEvent

        const factoryCid = created?.contractId as string | undefined
        if (!factoryCid)
            throw new Error(
                'Factory contractId not found in transaction response'
            )

        this.registryService.upsertTransferFactory({
            admin: this.party as string,
            id: symbol,
            factoryId: factoryCid,
        })
        return response
    }

    public async createHolding(
        receiver: string,
        instrumentId: {
            admin: string
            id: string
        },
        amount: string
    ): Promise<PostResponse<'/v2/commands/submit-and-wait'>> {
        if (!this.isOperator) {
            throw new Error('Not allowed to mint tokens')
        }
        type CreateArgs = {
            owner: string
            dso: string
            amount: string
            instrumentId: {
                admin: string
                id: string
            }
            meta: {
                values: Record<string, unknown>
            }
        }

        if (!this.party) {
            throw new Error(`Party not found`)
        }

        const args: CreateArgs = {
            owner: receiver,
            dso: this.party,
            instrumentId: instrumentId,
            amount: amount,
            meta: { values: {} },
        }

        // @ts-expect-error reason TBS
        const requestBody: PostRequest<'/v2/commands/submit-and-wait'> = {
            actAs: [this.party],
            userId: this.userId,
            commandId: crypto.randomUUID(),
            commands: [
                {
                    CreateCommand: {
                        templateId: TokenHolding.templateId,
                        createArguments: args,
                    },
                },
            ],
        }

        return this.submitAndWaitPost(requestBody)
    }

    async acceptTransfer(
        transfer: TokenTransferInstruction
    ): Promise<PostResponse<'/v2/commands/submit-and-wait'>> {
        if (!this.party) {
            throw new Error(`Admin party not found`)
        }

        const updateArgs: TransferInstruction_Update = {
            extraActors: [this.party],
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }

        // @ts-expect-error reason TBS
        const requestBody: PostRequest<'/v2/commands/submit-and-wait'> = {
            actAs: [this.party],
            userId: this.userId,
            commandId: crypto.randomUUID(),
            commands: [
                {
                    ExerciseCommand: {
                        templateId: TransferInstruction.templateId,
                        // @ts-expect-error reason TBS
                        contractId: transfer.contractId,
                        choice: TransferInstruction.TransferInstruction_Update
                            .choiceName,
                        choiceArgument: updateArgs,
                    },
                },
            ],
        }

        return this.submitAndWaitPost(requestBody)
    }

    async rejectTransfer(
        transfer: TokenTransferInstruction
    ): Promise<PostResponse<'/v2/commands/submit-and-wait'>> {
        if (!this.party) {
            throw new Error(`Admin party not found`)
        }

        const updateArgs: TransferInstruction_Update = {
            extraActors: [this.party],
            extraArgs: {
                context: { values: {} },
                meta: { values: { action: 'remove' } },
            },
        }

        // @ts-expect-error reason TBS
        const requestBody: PostRequest<'/v2/commands/submit-and-wait'> = {
            actAs: [this.party],
            userId: this.userId,
            commandId: crypto.randomUUID(),
            commands: [
                {
                    ExerciseCommand: {
                        templateId: TransferInstruction.templateId,
                        // @ts-expect-error reason TBS
                        contractId: transfer.contractId,
                        choice: TransferInstruction.TransferInstruction_Update
                            .choiceName,
                        choiceArgument: updateArgs,
                    },
                },
            ],
        }

        return this.submitAndWaitPost(requestBody)
    }
}
