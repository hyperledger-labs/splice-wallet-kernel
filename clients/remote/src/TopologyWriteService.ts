import { LedgerClient } from 'core-ledger-client'
import {
    CryptoKeyFormat,
    SigningKeyScheme,
    SigningKeySpec,
    SigningPublicKey,
} from './_proto/com/digitalasset/canton/crypto/v30/crypto.js'
import {
    StoreId,
    StoreId_Authorized,
} from './_proto/com/digitalasset/canton/topology/admin/v30/common.js'
import {
    Enums_ParticipantPermission,
    Enums_TopologyChangeOp,
    NamespaceDelegation,
    PartyToKeyMapping,
    PartyToParticipant,
    PartyToParticipant_HostingParticipant,
    SignedTopologyTransaction,
    TopologyMapping,
} from './_proto/com/digitalasset/canton/protocol/v30/topology.js'
import {
    AddTransactionsRequest,
    AddTransactionsResponse,
    AuthorizeRequest,
    AuthorizeRequest_Proposal,
    AuthorizeResponse,
    GenerateTransactionsRequest,
    GenerateTransactionsRequest_Proposal,
    GenerateTransactionsResponse,
} from './_proto/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js'
import { TopologyManagerWriteServiceClient } from './_proto/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.client.js'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ChannelCredentials } from '@grpc/grpc-js'
import { createHash } from 'node:crypto'

function prefixedInt(value: number, bytes: Buffer | Uint8Array): Buffer {
    const buffer = Buffer.alloc(4 + bytes.length)
    buffer.writeUInt32BE(value, 0)
    Buffer.from(bytes).copy(buffer, 4)
    return buffer
}

function signingPublicKeyFromEd25519(publicKey: string): SigningPublicKey {
    return {
        format: CryptoKeyFormat.RAW,
        publicKey: Buffer.from(publicKey, 'base64'),
        scheme: SigningKeyScheme.ED25519,
        keySpec: SigningKeySpec.EC_CURVE25519,
        usage: [],
    }
}

function computeSha256CantonHash(purpose: number, bytes: Uint8Array): string {
    const hashInput = prefixedInt(purpose, bytes)

    const hash = createHash('sha256').update(hashInput).digest()
    const multiprefix = Buffer.from([0x12, 0x20])

    return Buffer.concat([multiprefix, hash]).toString('hex')
}

export class TopologyWriteService {
    private topologyClient: TopologyManagerWriteServiceClient
    private ledgerClient: LedgerClient

    private store: StoreId = StoreId.create({
        store: {
            oneofKind: 'authorized',
            authorized: StoreId_Authorized.create(),
        },
    })

    constructor(userAdminUrl: string, ledgerClient: LedgerClient) {
        const transport = new GrpcTransport({
            host: userAdminUrl,
            channelCredentials: ChannelCredentials.createInsecure(),
        })

        this.topologyClient = new TopologyManagerWriteServiceClient(transport)
        this.ledgerClient = ledgerClient
    }

    static combineHashes(hashes: string[]): string {
        // hashes should be sorted lexicographically by hex string
        const sorted = hashes.sort().map((hash) => Buffer.from(hash, 'hex'))

        const initial = Buffer.alloc(4)
        initial.writeUInt32BE(sorted.length, 0)

        const combined = sorted.reduce<Buffer>((acc, hash) => {
            const input = prefixedInt(hash.length, hash)
            return Buffer.concat([acc, input])
        }, initial)

        return computeSha256CantonHash(55, combined)
    }

    static createFingerprintFromKey = (
        publicKey: SigningPublicKey | string
    ): string => {
        let key: SigningPublicKey

        if (typeof publicKey === 'string') {
            key = signingPublicKeyFromEd25519(publicKey)
        } else {
            key = publicKey
        }

        // Hash purpose codes can be looked up in the Canton codebase:
        //  https://github.com/DACH-NY/canton/blob/62e9ccd3f1743d2c9422d863cfc2ca800405c71b/community/base/src/main/scala/com/digitalasset/canton/crypto/HashPurpose.scala#L52
        const hashPurpose = 12 // For `PublicKeyFingerprint`

        // Implementation for creating a fingerprint from the public key
        return computeSha256CantonHash(hashPurpose, key.publicKey)
    }

    private generateTransactionsRequest(
        namespace: string,
        partyId: string,
        participantUid: string,
        publicKey: SigningPublicKey,
        authorizedStore: StoreId
    ): GenerateTransactionsRequest {
        // Implementation for generating transactions request
        const namespaceDelegation = NamespaceDelegation.create({
            namespace,
            targetKey: publicKey,
            isRootDelegation: true,
            restriction: {
                oneofKind: undefined,
            },
        })

        const partyToParticipant = PartyToParticipant.create({
            party: partyId,
            threshold: 1,
            participants: [
                {
                    participantUid,
                    permission: Enums_ParticipantPermission.CONFIRMATION,
                },
            ],
        })

        const partyToKeyMapping = PartyToKeyMapping.create({
            party: partyId,
            threshold: 1,
            signingKeys: [publicKey],
        })

        return GenerateTransactionsRequest.create({
            proposals: [
                GenerateTransactionsRequest_Proposal.create({
                    mapping: TopologyMapping.create({
                        mapping: {
                            oneofKind: 'namespaceDelegation',
                            namespaceDelegation,
                        },
                    }),
                    serial: 1,
                    store: authorizedStore,
                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                }),
                GenerateTransactionsRequest_Proposal.create({
                    mapping: TopologyMapping.create({
                        mapping: {
                            oneofKind: 'partyToParticipant',
                            partyToParticipant,
                        },
                    }),
                    serial: 1,
                    store: authorizedStore,
                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                }),
                GenerateTransactionsRequest_Proposal.create({
                    mapping: TopologyMapping.create({
                        mapping: {
                            oneofKind: 'partyToKeyMapping',
                            partyToKeyMapping,
                        },
                    }),
                    serial: 1,
                    store: authorizedStore,
                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                }),
            ],
        })
    }

    async generateTransactions(
        publicKey: string,
        partyHint: string
    ): Promise<GenerateTransactionsResponse> {
        const signingPublicKey = signingPublicKeyFromEd25519(publicKey)
        const namespace =
            TopologyWriteService.createFingerprintFromKey(signingPublicKey)

        const partyId = `${partyHint}::${namespace}`

        const { participantId } =
            await this.ledgerClient.partiesParticipantIdGet()

        const req = this.generateTransactionsRequest(
            namespace,
            partyId,
            participantId,
            signingPublicKey,
            this.store
        )

        return this.topologyClient.generateTransactions(req).response
    }

    async addTransactions(
        signedTopologyTxs: SignedTopologyTransaction[]
    ): Promise<AddTransactionsResponse> {
        const request = AddTransactionsRequest.create({
            transactions: signedTopologyTxs,
            forceChanges: [],
            store: this.store,
        })

        return this.topologyClient.addTransactions(request).response
    }

    async getPartyToParticipantMapping(
        partyId: string
    ): Promise<TopologyMapping> {
        const { participantId } =
            await this.ledgerClient.partiesParticipantIdGet()

        return TopologyMapping.create({
            mapping: {
                oneofKind: 'partyToParticipant',
                partyToParticipant: PartyToParticipant.create({
                    party: partyId,
                    threshold: 1,
                    participants: [
                        PartyToParticipant_HostingParticipant.create({
                            participantUid: participantId,
                            permission:
                                Enums_ParticipantPermission.CONFIRMATION,
                        }),
                    ],
                }),
            },
        })
    }

    async authorize(mapping: TopologyMapping): Promise<AuthorizeResponse> {
        const request = AuthorizeRequest.create({
            type: {
                oneofKind: 'proposal',
                proposal: AuthorizeRequest_Proposal.create({
                    mapping,
                    change: Enums_TopologyChangeOp.ADD_REPLACE,
                    serial: 1,
                }),
            },
            mustFullyAuthorize: false,
            store: this.store,
        })

        return this.topologyClient.authorize(request).response
    }
}
