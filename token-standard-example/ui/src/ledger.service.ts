import { SignJWT } from 'jose'
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
import type {
    ActiveContractsPostReq,
    ActiveContractsPostRes,
    SubmitAndWaitPostReq,
    SubmitAndWaitPostRes,
} from 'core-ledger-client'
import { LedgerClient } from 'core-ledger-client'
import pino from 'pino'

const logger = pino({ name: 'token-standard-example', level: 'debug' })

const PROXY_URL = 'http://localhost:8000/'

async function getAuthToken(party: string): Promise<string> {
    const secret = new TextEncoder().encode('secret')
    return await new SignJWT({
        sub: party,
        scope: 'daml_ledger_api',
        'https://daml.com/ledger-api': {
            actAs: [party],
            readAs: [party],
        },
    })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret)
}

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
        private readonly authToken: string,
        private readonly ledgerClient: LedgerClient
    ) {}

    public userId?: string
    public party?: string

    static async create(login: string): Promise<LedgerService> {
        const token = await getAuthToken(login)
        const client = createLedgerApiClient(token)
        const svc = new LedgerService(login, token, client)
        await svc.init()
        return svc
    }

    private async init(): Promise<void> {
        const user = await this.ledgerClient.getUserById(this.login)
        if (!user?.user) throw new Error('No such user')
        this.userId = user.user.id
        this.party = user.user.primaryParty
        // TODO I don't like it here, call it from somewhere else than init
        await this.fetchTransferFactories()
    }

    private mapTransferFactoriesResponseData(
        response: ActiveContractsPostRes
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
        response: ActiveContractsPostRes
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
        response: ActiveContractsPostRes
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

    private async fetchActiveContractsByTemplate(templateId?: string) {
        if (!this.party) throw new Error('No defined party')
        if (!templateId) throw new Error('No defined templateId')

        const offsetResponse = await this.ledgerClient.getLedgerEnd()
        const { offset } = offsetResponse

        const req: ActiveContractsPostReq = {
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
        return this.ledgerClient.getActiveContracts(req)
    }

    public async connectActiveContractsStream(
        templateId: string,
        party: string
    ): Promise<WebSocket> {
        if (!this.party) throw new Error('No defined party')
        if (!templateId) throw new Error('No defined templateId')

        const offsetResponse = await this.ledgerClient.getLedgerEnd()
        const { offset } = offsetResponse

        const wsUrl = PROXY_URL.replace(/^http/, 'ws') + `v2/updates/flats`

        const ws = new WebSocket(wsUrl, ['daml.ws.auth', this.authToken])
        // window.myWs = ws;

        ws.onopen = () => {
            console.log('WebSocket connected')

            const updatesRequest = {
                beginExclusive: offset,
                verbose: false,
                updateFormat: {
                    includeTransactions: {
                        eventFormat: {
                            filtersByParty: {
                                [party]: {
                                    cumulative: [
                                        {
                                            identifierFilter: {
                                                TemplateFilter: {
                                                    value: {
                                                        templateId,
                                                        includeCreatedEventBlob:
                                                            false,
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                            verbose: false,
                        },
                        transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
                    },
                },
            }

            ws.send(JSON.stringify(updatesRequest))
        }

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data)
                console.log('Active contracts stream event:', msg)
            } catch (err) {
                console.error('Failed to parse stream message', err)
            }
        }

        ws.onerror = (err) => {
            console.error('WebSocket error:', err)
        }

        ws.onclose = (arg) => {
            console.log('Active contracts stream closed.', arg)
        }

        return ws
    }

    public async fetchHoldings(): Promise<ITokenHolding[]> {
        // window.holdingsSocket = await this.connectActiveContractsStream(TokenHolding.templateId, this.party)
        // console.log('socket', window.holdingsSocket);
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

    public async createTransfer(
        receiver: string,
        token: string,
        amount: string,
        inputHoldingCids: string[]
    ): Promise<SubmitAndWaitPostRes> {
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
        const requestBody: SubmitAndWaitPostReq = {
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

        return this.ledgerClient.submitAndWaitPost(requestBody)
    }

    async acceptTransfer(transfer: TokenTransferInstruction): Promise<void> {
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
        const requestBody: SubmitAndWaitPostReq = {
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

        await this.ledgerClient.submitAndWaitPost(requestBody)
    }

    async rejectTransfer(transfer: TokenTransferInstruction): Promise<void> {
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
        const requestBody: SubmitAndWaitPostReq = {
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

        await this.ledgerClient.submitAndWaitPost(requestBody)
    }
}
