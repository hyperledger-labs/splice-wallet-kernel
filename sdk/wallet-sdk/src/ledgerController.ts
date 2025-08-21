import {
    LedgerClient,
    PostResponse,
    GetResponse,
    TopologyWriteService,
} from '@splice/core-ledger-client'
import {
    signTransactionHash,
    getPublicKeyFromPrivate,
} from '@splice/core-signing-lib'
import { v4 } from 'uuid'
import { pino } from 'pino'
import { SigningPublicKey } from '@splice/core-ledger-client/src/_proto/com/digitalasset/canton/crypto/v30/crypto'

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
        publicKey: SigningPublicKey | string,
        submissionId?: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>>

    allocateInternalParty(
        partyHint?: string
    ): Promise<PostResponse<'/v2/parties'>>
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

    async prepareSignAndExecuteTransaction(
        commands: unknown,
        privateKey: string,
        commandId: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>> {
        const prepared = await this.prepareSubmission(commands, commandId)

        const signature = signTransactionHash(
            prepared.preparedTransactionHash,
            privateKey
        )
        const publicKey = getPublicKeyFromPrivate(privateKey)

        return this.executeSubmission(prepared, signature, publicKey, commandId)
    }

    async allocateInternalParty(
        partyHint?: string
    ): Promise<PostResponse<'/v2/parties'>> {
        return await this.client.post('/v2/parties', {
            partyIdHint: partyHint || v4(),
            identityProviderId: '',
        })
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
        publicKey: SigningPublicKey | string,
        submissionId: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>> {
        if (prepared.preparedTransaction === undefined) {
            throw new Error('preparedTransaction is undefined')
        }
        const transaction: string = prepared.preparedTransaction

        const request = {
            userId: this.userId,
            preparedTransaction: transaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: submissionId,
            deduplicationPeriod: {
                Empty: {},
            },
            partySignatures: {
                signatures: [
                    {
                        party: this.partyId,
                        signatures: [
                            {
                                signature,
                                signedBy:
                                    this.createFingerPrintFromPublicKey(
                                        publicKey
                                    ),
                                format: 'SIGNATURE_FORMAT_RAW',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                ],
            },
        }

        return await this.client.post(
            '/v2/interactive-submission/execute',
            request
        )
    }

    async listWallets(): Promise<GetResponse<'/v2/parties'>> {
        return await this.client.get('/v2/parties', {})
    }

    createFingerPrintFromPublicKey(
        publicKey: SigningPublicKey | string
    ): string {
        return TopologyWriteService.createFingerprintFromKey(publicKey)
    }
}

export const localLedgerDefault = (
    userId: string,
    token: string
): LedgerController => {
    return new LedgerController(userId, 'http://127.0.0.1:5003', token)
}
