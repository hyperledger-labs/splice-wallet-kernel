import {
    DisclosedContract,
    LedgerClient,
    TokenStandardService,
} from '@canton-network/core-ledger-client'
import { pino } from 'pino'
import { PrettyTransactions } from '@canton-network/core-ledger-client'

/**
 * TokenStandardController handles token standard management tasks.
 * This controller requires a userId and token.
 */
export class TokenStandardController {
    private logger = pino({ name: 'TokenStandardController', level: 'info' })
    private client: LedgerClient
    private service: TokenStandardService
    private userId: string
    private partyId: string = ''
    private synchronizerId: string = ''
    private transferFactoryRegistryUrl: string = ''

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param accessToken the access token from the user, usually provided by an auth controller.
     */
    constructor(
        userId: string,
        baseUrl: string,
        private accessToken: string
    ) {
        this.client = new LedgerClient(baseUrl, accessToken, this.logger)
        this.service = new TokenStandardService(this.client, this.logger)
        this.userId = userId
        return this
    }

    /**
     * Sets the party that the TokenStandardController will use for requests.
     * @param partyId
     */
    setPartyId(partyId: string): TokenStandardController {
        this.partyId = partyId
        return this
    }

    /**
     * Sets the synchronizerId that the TokenStandardController will use for requests.
     * @param synchronizerId
     */
    setSynchronizerId(synchronizerId: string): TokenStandardController {
        this.synchronizerId = synchronizerId
        return this
    }

    /**
     * Sets the transferFactoryRegistryUrl that the TokenStandardController will use for requests.
     * @param transferFactoryRegistryUrl
     */
    setTransferFactoryRegistryUrl(
        transferFactoryRegistryUrl: string
    ): TokenStandardController {
        this.transferFactoryRegistryUrl = transferFactoryRegistryUrl
        return this
    }

    /** Lists all holdings for the current party.
     * @param afterOffset optional pagination offset.
     * @returns A promise that resolves to an array of holdings.
     */
    async listHoldingTransactions(
        afterOffset?: string
    ): Promise<PrettyTransactions> {
        return await this.service.listHoldingTransactions(
            this.partyId,
            afterOffset
        )
    }
    async createTap(
        receiver: string,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: string
        }
    ): Promise<[unknown, DisclosedContract[]]> {
        return this.service.createTap(
            receiver,
            amount,
            instrument.instrumentAdmin,
            instrument.instrumentId,
            this.transferFactoryRegistryUrl
        )
    }

    async createTransfer(
        sender: string,
        receiver: string,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: string
        },
        meta?: Record<string, never>
    ): Promise<[unknown, DisclosedContract[]]> {
        try {
            return await this.service.createTransfer(
                sender,
                receiver,
                amount,
                instrument.instrumentAdmin,
                instrument.instrumentId,
                this.transferFactoryRegistryUrl,
                meta
            )
        } catch (error) {
            this.logger.error({ error }, 'Failed to create transfer')
            throw error
        }
    }
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localTokenStandardDefault = (
    userId: string,
    token: string
): TokenStandardController => {
    return new TokenStandardController(userId, 'http://127.0.0.1:5003', token)
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetTokenStandardDefault = (
    userId: string,
    token: string
): TokenStandardController => {
    return new TokenStandardController(userId, 'http://127.0.0.1:2975', token)
}
