// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from './ledger-client.js'
import { createHash } from 'node:crypto'
import { AccessTokenProvider, PartyId } from '@canton-network/core-types'
import {
    CryptoKeyFormat,
    SigningKeyScheme,
    SigningKeySpec,
    SigningPublicKey,
    Signature,
    SignatureFormat,
    SigningAlgorithmSpec,
    TopologyManagerWriteServiceClient,
    StoreId,
    StoreId_Synchronizer,
    Enums_ParticipantPermission,
    Enums_TopologyChangeOp,
    NamespaceDelegation,
    PartyToKeyMapping,
    PartyToParticipant,
    PartyToParticipant_HostingParticipant,
    SignedTopologyTransaction,
    TopologyMapping,
    MultiTransactionSignatures,
    AddTransactionsRequest,
    AddTransactionsResponse,
    AuthorizeRequest,
    AuthorizeResponse,
    GenerateTransactionsRequest,
    GenerateTransactionsRequest_Proposal,
    GenerateTransactionsResponse,
    BaseQuery,
    ListPartyToParticipantRequest,
    Empty,
    TopologyManagerReadServiceClient,
} from '@canton-network/core-ledger-proto'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ChannelCredentials } from '@grpc/grpc-js'
import fs from 'node:fs'

function prefixedInt(value: number, bytes: Buffer | Uint8Array): Buffer {
    const buffer = Buffer.alloc(4 + bytes.length)
    buffer.writeUInt32BE(value, 0)
    Buffer.from(bytes).copy(buffer, 4)
    return buffer
}

/**
 * @deprecated used only to convert public key into grpc protobuf representation
 */
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

export interface TlsOptions {
    rootCert?: string | Buffer
    clientCert?: string | Buffer
    clientKey?: string | Buffer
    mutual?: boolean
}

export interface GrpcClientOptions {
    useTls?: boolean
    tls: TlsOptions
}

function createGrpcTransport(options: GrpcClientOptions) {
    const { useTls = false, tls } = options

    if (useTls) {
        const readMaybeFile = (value?: string | Buffer) =>
            typeof value === 'string' ? fs.readFileSync(value) : value

        const rootCert = readMaybeFile(tls?.rootCert)
        const clientCert = readMaybeFile(tls?.clientCert)
        const clientKey = readMaybeFile(tls?.clientKey)

        if (tls?.mutual) {
            if (!clientCert || !clientKey) {
                throw new Error(
                    'mTLS enabled but clientCert or clientKey are missing'
                )
            }
            return ChannelCredentials.createSsl(rootCert, clientKey, clientCert)
        } else {
            return ChannelCredentials.createSsl(rootCert)
        }
    } else {
        return ChannelCredentials.createInsecure()
    }
}

export class TopologyWriteService {
    private topologyClient: TopologyManagerWriteServiceClient
    private topologyReadService: TopologyManagerReadServiceClient
    private ledgerClient: LedgerClient
    private accessTokenProvider: AccessTokenProvider | undefined
    private accessToken: string | undefined

    private storeId = () =>
        StoreId.create({
            store: {
                oneofKind: 'synchronizer',
                synchronizer: StoreId_Synchronizer.create({
                    id: this.synchronizerId,
                }),
            },
        })

    constructor(
        private synchronizerId: string,
        userAdminUrl: string,
        ledgerClient: LedgerClient,
        accessToken: string = '',
        accessTokenProvider?: AccessTokenProvider,
        grpcClientOptions?: GrpcClientOptions
    ) {
        let transport: GrpcTransport
        if (grpcClientOptions) {
            transport = new GrpcTransport({
                host: userAdminUrl,
                channelCredentials: createGrpcTransport(grpcClientOptions),
            })
        } else {
            transport = new GrpcTransport({
                host: userAdminUrl,
                channelCredentials: ChannelCredentials.createInsecure(),
            })
        }

        this.topologyClient = new TopologyManagerWriteServiceClient(transport)
        this.topologyReadService = new TopologyManagerReadServiceClient(
            transport
        )
        this.ledgerClient = ledgerClient
        this.accessTokenProvider = accessTokenProvider
        this.accessToken = accessToken
    }

    static combineHashes(hashes: Buffer[]): string {
        // Sort the hashes by their hex representation
        const sortedHashes = hashes.sort((a, b) =>
            a.toString('hex').localeCompare(b.toString('hex'))
        )

        // Start with the number of hashes encoded as a 4-byte integer in big-endian
        const combinedHashes = Buffer.alloc(4)
        combinedHashes.writeUInt32BE(sortedHashes.length, 0)

        // Concatenate each hash, prefixing them with their size as a 4-byte integer in big-endian
        let concatenatedHashes = combinedHashes
        for (const h of sortedHashes) {
            const lengthBuffer = Buffer.alloc(4)
            lengthBuffer.writeUInt32BE(h.length, 0)
            concatenatedHashes = Buffer.concat([
                concatenatedHashes,
                lengthBuffer,
                h,
            ])
        }

        // 55 is the hash purpose for multi topology transaction hashes
        const predefineHashPurpose = computeSha256CantonHash(
            55,
            concatenatedHashes
        )

        //convert to base64
        return Buffer.from(predefineHashPurpose, 'hex').toString('base64')
    }

    static createFingerprintFromKey(publicKey: string): string
    /** @deprecated using the protobuf publickey is no longer supported -- use the string parameter instead */
    static createFingerprintFromKey(publicKey: SigningPublicKey): string
    /** @deprecated using the protobuf publickey is no longer supported -- use the string parameter instead */
    static createFingerprintFromKey(
        publicKey: SigningPublicKey | string
    ): string
    static createFingerprintFromKey(
        publicKey: SigningPublicKey | string
    ): string {
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

    /** @deprecated only for grpc/protobuf implementation */
    static toSignedTopologyTransaction(
        txHashes: Buffer<ArrayBuffer>[],
        serializedTransaction: Uint8Array<ArrayBufferLike>,
        signature: string,
        namespace: string
    ): SignedTopologyTransaction {
        return SignedTopologyTransaction.create({
            transaction: serializedTransaction,
            proposal: true,
            signatures: [],
            multiTransactionSignatures: [
                MultiTransactionSignatures.create({
                    transactionHashes: txHashes,
                    signatures: [
                        Signature.create({
                            format: SignatureFormat.RAW,
                            signature: Buffer.from(signature, 'base64'),
                            signedBy: namespace,
                            signingAlgorithmSpec: SigningAlgorithmSpec.ED25519,
                        }),
                    ],
                }),
            ],
        })
    }

    /** @deprecated */
    private generateTransactionsRequest(
        namespace: string,
        partyId: PartyId,
        publicKey: SigningPublicKey,
        confirmingThreshold: number = 1,
        hostingParticipantRights: Map<string, Enums_ParticipantPermission>
    ): GenerateTransactionsRequest {
        // Implementation for generating transactions request
        const namespaceDelegation = TopologyMapping.create({
            mapping: {
                oneofKind: 'namespaceDelegation',
                namespaceDelegation: NamespaceDelegation.create({
                    namespace,
                    targetKey: publicKey,
                    isRootDelegation: true,
                    restriction: {
                        oneofKind: undefined,
                    },
                }),
            },
        })

        const hostingParticipants = [...hostingParticipantRights].map(
            ([participantUid, permission]) =>
                PartyToParticipant_HostingParticipant.create({
                    participantUid,
                    permission,
                })
        )

        const partyToParticipant = TopologyMapping.create({
            mapping: {
                oneofKind: 'partyToParticipant',
                partyToParticipant: PartyToParticipant.create({
                    party: partyId,
                    threshold: confirmingThreshold,
                    participants: hostingParticipants,
                }),
            },
        })

        const partyToKeyMapping = TopologyMapping.create({
            mapping: {
                oneofKind: 'partyToKeyMapping',
                partyToKeyMapping: PartyToKeyMapping.create({
                    party: partyId,
                    threshold: 1,
                    signingKeys: [publicKey],
                }),
            },
        })

        return GenerateTransactionsRequest.create({
            proposals: [
                namespaceDelegation,
                partyToParticipant,
                partyToKeyMapping,
            ].map((mapping) =>
                GenerateTransactionsRequest_Proposal.create({
                    mapping,
                    serial: 1,
                    store: this.storeId(),
                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                })
            ),
        })
    }

    /** @deprecated use allocateExternalParty() instead */
    async submitExternalPartyTopology(
        signedTopologyTxs: SignedTopologyTransaction[],
        partyId: PartyId
    ) {
        await this.addTransactions(signedTopologyTxs)
        await this.authorizePartyToParticipant(partyId)
    }

    /** @deprecated use generateTopology() */
    async generateTransactions(
        publicKey: string,
        partyId: PartyId,
        confirmingThreshold: number = 1,
        hostingParticipantRights?: Map<string, Enums_ParticipantPermission>
    ): Promise<GenerateTransactionsResponse> {
        const signingPublicKey = signingPublicKeyFromEd25519(publicKey)
        const namespace =
            TopologyWriteService.createFingerprintFromKey(signingPublicKey)

        let participantRights = hostingParticipantRights

        // if no participantRights have been supplied, this party will be hosted on 1 validator (not multi-hosted)
        // the default is to get the participantId from ledger client with Confirmation rights
        if (!participantRights || participantRights.size === 0) {
            const { participantId } = await this.ledgerClient.getWithRetry(
                '/v2/parties/participant-id'
            )

            participantRights = new Map<string, Enums_ParticipantPermission>([
                [participantId, Enums_ParticipantPermission.CONFIRMATION],
            ])
        }

        const req = this.generateTransactionsRequest(
            namespace,
            partyId,
            signingPublicKey,
            confirmingThreshold,
            participantRights
        )
        const adminAccessToken = this.accessTokenProvider
            ? await this.accessTokenProvider.getAdminAccessToken()
            : this.accessToken

        return this.topologyClient.generateTransactions(req, {
            meta: {
                Authorization: `Bearer ${adminAccessToken}`,
            },
        }).response
    }

    /** @deprecated */
    private async addTransactions(
        signedTopologyTxs: SignedTopologyTransaction[]
    ): Promise<AddTransactionsResponse> {
        const request = AddTransactionsRequest.create({
            transactions: signedTopologyTxs,
            forceChanges: [],
            store: this.storeId(),
        })
        const adminAccessToken = this.accessTokenProvider
            ? await this.accessTokenProvider.getAdminAccessToken()
            : this.accessToken
        return this.topologyClient.addTransactions(request, {
            meta: {
                Authorization: `Bearer ${adminAccessToken}`,
            },
        }).response
    }

    /** @deprecated */
    async waitForPartyToParticipantProposal(
        partyId: PartyId
    ): Promise<Uint8Array | undefined> {
        let counter = 0
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                const result =
                    await this.topologyReadService.listPartyToParticipant(
                        ListPartyToParticipantRequest.create({
                            baseQuery: BaseQuery.create({
                                store: this.storeId(),
                                proposals: true,
                                timeQuery: {
                                    oneofKind: 'headState',
                                    headState: Empty.create(),
                                },
                            }),
                            filterParty: partyId,
                        })
                    )

                if (result.response.results.length > 0) {
                    clearInterval(interval)
                    resolve(result.response.results[0].context?.transactionHash)
                }

                counter += 1
                if (counter > 10) {
                    clearInterval(interval)
                    reject('Timeout waiting for party to participant proposal')
                }
            }, 1000)
        })
    }

    /** @deprecated */
    async authorizePartyToParticipant(
        partyId: PartyId
    ): Promise<AuthorizeResponse> {
        const hash = await this.waitForPartyToParticipantProposal(partyId)
        if (!hash) {
            throw new Error('No topology transaction found for authorization')
        }

        const request = AuthorizeRequest.create({
            type: {
                oneofKind: 'transactionHash',
                transactionHash: Buffer.from(hash).toString('hex'),
            },
            mustFullyAuthorize: false,
            store: this.storeId(),
        })
        const adminAccessToken = this.accessTokenProvider
            ? await this.accessTokenProvider.getAdminAccessToken()
            : this.accessToken
        return this.topologyClient.authorize(request, {
            meta: {
                Authorization: `Bearer ${adminAccessToken}`,
            },
        }).response
    }
}
