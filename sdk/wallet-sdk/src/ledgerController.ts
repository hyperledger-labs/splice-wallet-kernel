import { LedgerClient, PostResponse } from 'core-ledger-client'
import { v4 } from 'uuid'
import { pino } from 'pino'

export interface ledgerController {
    setPartyId(partyId: string): LedgerController
    setSynchronizerId(synchronizerId: string): LedgerController

    prepareSubmission(
        commands: unknown,
        commandId?: string
    ): Promise<PostResponse<'/v2/interactive-submission/prepare'>>

    executeSubmission(
        prepared: PostResponse<'/v2/interactive-submission/prepare'>,
        signature: string,
        submissionId?: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>>
}

export class LedgerController implements ledgerController {
    private client: LedgerClient
    private userId: string
    private partyId: string
    private synchronizerId: string
    private logger = pino({ name: 'LedgerController', level: 'debug' })

    constructor(userId: string, baseUrl: string, token: string) {
        this.client = new LedgerClient(baseUrl, token, this.logger)
        this.userId = userId
        this.partyId = ''
        this.synchronizerId = ''
        return this
    }

    setPartyId(partyId: string): LedgerController {
        this.partyId = partyId
        return this
    }

    setSynchronizerId(synchronizerId: string): LedgerController {
        this.synchronizerId = synchronizerId
        return this
    }

    async prepareSubmission(
        commands: unknown,
        commandId?: string
    ): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
        const prepareParams = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
            commands: commands as any,
            commandId: commandId || v4(),
            userId: this.userId,
            actAs: [this.partyId],
            readAs: [],
            disclosedContracts: [],
            synchronizerId: this.synchronizerId,
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        return await this.client.post(
            '/v2/interactive-submission/prepare',
            prepareParams
        )
    }

    async executeSubmission(
        prepared: PostResponse<'/v2/interactive-submission/prepare'>,
        signature: string,
        submissionId?: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>> {
        const request = {
            ...prepared,
            partySignature: signature,
            userId: this.userId,
            actAs: [this.partyId],
            readAs: [],
            synchronizerId: this.synchronizerId,
            submissionId: submissionId || v4(),
            deduplicationPeriod: {
                DeduplicationDuration: { value: { seconds: 30, nanos: 0 } },
            },
        }

        return await this.client.post(
            '/v2/interactive-submission/execute',
            request
        )
    }
}
