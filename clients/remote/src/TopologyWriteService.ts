import { LedgerClient } from 'core-ledger-client'
import {
    CryptoKeyFormat,
    SigningKeyScheme,
    SigningKeySpec,
    SigningPublicKey,
} from './generated/com/digitalasset/canton/crypto/v30/crypto.js'
import {
    StoreId,
    StoreId_Authorized,
} from './generated/com/digitalasset/canton/topology/admin/v30/common.js'
import {
    Enums_ParticipantPermission,
    Enums_TopologyChangeOp,
    NamespaceDelegation,
    PartyToKeyMapping,
    PartyToParticipant,
    TopologyMapping,
} from './generated/com/digitalasset/canton/protocol/v30/topology.js'
import {
    GenerateTransactionsRequest,
    GenerateTransactionsRequest_Proposal,
    GenerateTransactionsResponse,
} from './generated/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js'
import { TopologyManagerWriteServiceClient } from './generated/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.client.js'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ChannelCredentials } from '@grpc/grpc-js'

function signingPublicKeyFromEd25519(publicKey: string): SigningPublicKey {
    return {
        format: CryptoKeyFormat.RAW,
        publicKey: Buffer.from(publicKey, 'base64'),
        scheme: SigningKeyScheme.ED25519,
        keySpec: SigningKeySpec.EC_CURVE25519,
        usage: [],
    }
}

const createFingerprintFromKey = async (
    publicKey: SigningPublicKey
): Promise<string> => {
    console.log(publicKey)
    // Implementation for creating a fingerprint from the public key
    return 'fingerprint'
}

export class TopologyWriteService {
    private topologyClient: TopologyManagerWriteServiceClient
    private ledgerClient: LedgerClient

    constructor(userAdminUrl: string, ledgerClient: LedgerClient) {
        const transport = new GrpcTransport({
            host: userAdminUrl,
            channelCredentials: ChannelCredentials.createInsecure(),
        })

        this.topologyClient = new TopologyManagerWriteServiceClient(transport)
        this.ledgerClient = ledgerClient
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
        const namespace = await createFingerprintFromKey(signingPublicKey)
        const partyId = `${partyHint}::${namespace}`

        const authorizedStore = StoreId.create({
            store: {
                oneofKind: 'authorized',
                authorized: StoreId_Authorized.create(),
            },
        })

        const { participantId } =
            await this.ledgerClient.partiesParticipantIdGet()

        const req = this.generateTransactionsRequest(
            namespace,
            partyId,
            participantId,
            signingPublicKey,
            authorizedStore
        )

        return this.topologyClient.generateTransactions(req).response
    }
}
