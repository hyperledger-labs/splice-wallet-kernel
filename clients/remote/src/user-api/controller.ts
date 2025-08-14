// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LedgerClient } from 'core-ledger-client'
import buildController from './rpc-gen/index.js'
import {
    AddNetworkParams,
    RemoveNetworkParams,
    CreateWalletParams,
    CreateWalletResult,
    ExecuteParams,
    SignParams,
    AddSessionParams,
    AddSessionResult,
    ListSessionsResult,
    SetPrimaryWalletParams,
} from './rpc-gen/typings.js'
import { Store, Wallet, Auth, Transaction } from 'core-wallet-store'
import { Logger } from 'pino'
import {
    NotificationService,
    Notifier,
} from '../notification/NotificationService.js'
import { AuthContext } from 'core-wallet-auth'
import { KernelInfo } from '../config/Config.js'
import { SigningDriverInterface, SigningProvider } from 'core-signing-lib'
import { TopologyWriteService } from '../TopologyWriteService.js'
import {
    Signature,
    SignatureFormat,
    SigningAlgorithmSpec,
} from '../_proto/com/digitalasset/canton/crypto/v30/crypto.js'
import {
    MultiTransactionSignatures,
    SignedTopologyTransaction,
} from '../_proto/com/digitalasset/canton/protocol/v30/topology.js'
import { adminAuthService } from '../auth/admin-auth-service.js'
import { ExecuteResult } from 'core-wallet-user-rpc-client'

type AvailableSigningDrivers = Partial<
    Record<SigningProvider, SigningDriverInterface>
>

async function grantUserRights(
    partyId: string,
    userId: string,
    client: LedgerClient
) {
    // Wait for party to appear on participant
    let partyFound = false
    let tries = 0
    const maxTries = 5

    while (!partyFound || tries >= maxTries) {
        const parties = await client.get('/v2/parties')
        partyFound =
            parties.partyDetails?.some((party) => party.party === partyId) ||
            false

        await new Promise((resolve) => setTimeout(resolve, 1000))
        tries++
    }

    if (tries >= maxTries) {
        throw new Error('timed out waiting for new party to appear')
    }

    // Assign user rights to party
    const result = await client.post(
        '/v2/users/{user-id}/rights',
        {
            identityProviderId: '',
            userId,
            rights: [
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: partyId,
                            },
                        },
                    },
                },
            ],
        },
        {
            path: {
                'user-id': userId,
            },
        }
    )

    if (!result.newlyGrantedRights) {
        throw new Error('Failed to grant user rights')
    }

    return
}

async function signingDriverCreate(
    userId: string,
    store: Store,
    notifier: Notifier | undefined,
    ledgerClientAdmin: LedgerClient,
    adminToken: string,
    drivers: AvailableSigningDrivers,
    authContext: AuthContext,
    { signingProviderId, primary, partyHint, chainId }: CreateWalletParams
): Promise<CreateWalletResult> {
    const driver = drivers[signingProviderId as SigningProvider]

    if (!driver) {
        throw new Error(`Signing provider ${signingProviderId} not supported`)
    }

    let wallet: Wallet

    switch (signingProviderId) {
        case SigningProvider.PARTICIPANT: {
            const network = await store.getNetwork(chainId)

            const { participantId: namespace } = await ledgerClientAdmin.get(
                '/v2/parties/participant-id'
            )

            const res = await ledgerClientAdmin.post('/v2/parties', {
                userId,
                partyIdHint: partyHint,
                identityProviderId: '',
                synchronizerId: network.synchronizerId,
            })

            if (!res.partyDetails?.party) {
                throw new Error('Failed to allocate party')
            }

            wallet = {
                primary: primary ?? false,
                partyId: res.partyDetails.party,
                hint: partyHint,
                publicKey: namespace,
                namespace,
                chainId,
                signingProviderId,
            }

            grantUserRights(wallet.partyId, userId, ledgerClientAdmin)
            break
        }
        case SigningProvider.WALLET_KERNEL: {
            const network = await store.getNetwork(chainId)
            const topologyService = new TopologyWriteService(
                network.synchronizerId,
                network.ledgerApi.adminGrpcUrl,
                adminToken,
                ledgerClientAdmin
            )

            const key = await driver.controller(authContext).createKey({
                name: partyHint,
            })
            const namespace = TopologyWriteService.createFingerprintFromKey(
                key.publicKey
            )
            const partyId = `${partyHint}::${namespace}`

            const transactions = await topologyService
                .generateTransactions(key.publicKey, partyId)
                .then((resp) => resp.generatedTransactions)

            const txHashes = transactions.map((tx) =>
                Buffer.from(tx.transactionHash)
            )

            const combinedHash = TopologyWriteService.combineHashes(txHashes)

            const { signature } = await driver
                .controller(authContext)
                .signTransaction({
                    tx: '',
                    txHash: Buffer.from(combinedHash, 'hex').toString('base64'),
                    publicKey: key.publicKey,
                })

            const signedTopologyTxs = transactions.map((transaction) =>
                SignedTopologyTransaction.create({
                    transaction: transaction.serializedTransaction,
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
                                    signingAlgorithmSpec:
                                        SigningAlgorithmSpec.ED25519,
                                }),
                            ],
                        }),
                    ],
                })
            )

            topologyService.addTransactions(signedTopologyTxs)
            await topologyService.authorizePartyToParticipant(partyId)

            wallet = {
                partyId,
                namespace,
                signingProviderId,
                chainId,
                primary: primary ?? false,
                hint: partyHint,
                publicKey: key.publicKey,
            }

            grantUserRights(wallet.partyId, userId, ledgerClientAdmin)
            break
        }
        default:
            throw new Error(
                `Unsupported signing provider: ${signingProviderId}`
            )
    }

    await store.addWallet(wallet)

    const wallets = await store.getWallets()
    notifier?.emit('accountsChanged', wallets)

    return { wallet }
}

export const userController = (
    kernelInfo: KernelInfo,
    store: Store,
    notificationService: NotificationService,
    authContext: AuthContext | undefined,
    drivers: AvailableSigningDrivers,
    _logger: Logger
) => {
    const logger = _logger.child({ component: 'user-controller' })
    return buildController({
        addNetwork: async (network: AddNetworkParams) => {
            const ledgerApi = {
                baseUrl: network.ledgerApiUrl ?? '',
            }

            let auth: Auth
            if (network.auth.type === 'implicit') {
                auth = {
                    type: 'implicit',
                    issuer: network.auth.issuer ?? '',
                    configUrl: network.auth.configUrl ?? '',
                    audience: network.auth.audience ?? '',
                    scope: network.auth.scope ?? '',
                    clientId: network.auth.clientId ?? '',
                }
            } else {
                auth = {
                    type: 'password',
                    issuer: network.auth.issuer ?? '',
                    configUrl: network.auth.configUrl ?? '',
                    tokenUrl: network.auth.tokenUrl ?? '',
                    grantType: network.auth.grantType ?? '',
                    scope: network.auth.scope ?? '',
                    clientId: network.auth.clientId ?? '',
                    audience: network.auth.audience ?? '',
                }
            }

            const newNetwork = {
                name: network.network.name,
                chainId: network.network.chainId,
                description: network.network.description,
                synchronizerId: network.network.synchronizerId,
                auth,
                ledgerApi,
            }

            await store.addNetwork(newNetwork)
            return null
        },
        removeNetwork: async (params: RemoveNetworkParams) => {
            await store.removeNetwork(params.networkName)
            return null
        },
        createWallet: async (params: {
            primary?: boolean
            partyHint: string
            chainId: string
            signingProviderId: string
        }) => {
            logger.info(
                `Allocating party with params: ${JSON.stringify(params)}`
            )

            const userId = authContext?.userId

            if (!userId) {
                throw new Error('User not found')
            }

            const notifier = notificationService.getNotifier(userId)
            const network = await store.getCurrentNetwork()

            if (authContext === undefined || network === undefined) {
                throw new Error('Unauthenticated context')
            }

            const ledgerClient = new LedgerClient(
                network.ledgerApi.baseUrl,
                authContext?.accessToken,
                logger
            )

            const adminToken = await adminAuthService(
                store,
                logger
            ).fetchToken()

            const ledgerClientAdmin = new LedgerClient(
                network.ledgerApi.baseUrl,
                adminToken,
                logger
            )

            const result = await signingDriverCreate(
                userId,
                store,
                notifier,
                ledgerClientAdmin,
                adminToken,
                drivers,
                authContext,
                params
            )
            return result
        },
        setPrimaryWallet: async (params: SetPrimaryWalletParams) => {
            store.setPrimaryWallet(params.partyId)
            const notifier = authContext?.userId
                ? notificationService.getNotifier(authContext.userId)
                : undefined
            notifier?.emit('accountsChanged', store.getWallets())
            return null
        },
        removeWallet: async (params: { partyId: string }) =>
            Promise.resolve({}),
        listWallets: async (params: {
            filter?: { chainIds?: string[]; signingProviderIds?: string[] }
        }) => {
            // TODO: support filters
            return store.getWallets()
        },
        sign: async ({
            preparedTransaction,
            preparedTransactionHash,
            partyId,
            commandId,
        }: SignParams) => {
            const wallets = await store.getWallets()
            const wallet = wallets.find((w) => w.partyId === partyId)

            const network = await store.getCurrentNetwork()

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            if (authContext === undefined || network === undefined) {
                throw new Error('Unauthenticated context')
            }

            const userId = authContext.userId
            const notifier = notificationService.getNotifier(userId)

            const signingProvider = wallet.signingProviderId as SigningProvider
            const driver = drivers[signingProvider]
            if (!driver) {
                throw new Error('No driver found for WALLET_KERNEL')
            }

            switch (wallet.signingProviderId) {
                case SigningProvider.PARTICIPANT: {
                    return {
                        signature: 'none',
                        signedBy: wallet.namespace,
                        partyId,
                    }
                }
                case SigningProvider.WALLET_KERNEL: {
                    const signature = await driver
                        .controller(authContext)
                        .signTransaction({
                            tx: preparedTransaction,
                            txHash: preparedTransactionHash,
                            publicKey: wallet.publicKey,
                        })

                    if (!signature.signature) {
                        throw new Error(
                            'Failed to sign transaction: ' +
                                JSON.stringify(signature)
                        )
                    }

                    const signedTx: Transaction = {
                        commandId,
                        status: 'signed',
                        preparedTransaction,
                        preparedTransactionHash,
                    }

                    store.setTransaction(signedTx)
                    notifier.emit('txChanged', signedTx)

                    return {
                        signature: signature.signature,
                        signedBy: wallet.namespace,
                        partyId: wallet.partyId,
                    }
                }
                default:
                    throw new Error(
                        `Unsupported signing provider: ${wallet.signingProviderId}`
                    )
            }
        },
        execute: async ({
            commandId,
            signature,
            signedBy,
            partyId,
        }: ExecuteParams) => {
            const wallet = await store.getPrimaryWallet()
            const network = await store.getCurrentNetwork()
            const transaction = await store.getTransaction(commandId)

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            if (transaction === undefined) {
                throw new Error('No transaction found')
            }

            if (authContext === undefined || network === undefined) {
                throw new Error('Unauthenticated context')
            }

            const userId = authContext.userId
            const notifier = notificationService.getNotifier(userId)

            const ledgerClient = new LedgerClient(
                network.ledgerApi.baseUrl,
                authContext.accessToken,
                logger
            )

            switch (wallet.signingProviderId) {
                case SigningProvider.PARTICIPANT: {
                    // Participant signing provider specific logic can be added here
                    const request = {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
                        commands: transaction?.payload as any,
                        commandId,
                        userId,
                        actAs: [partyId],
                        readAs: [],
                        disclosedContracts: [],
                        synchronizerId: network.synchronizerId,
                        packageIdSelectionPreference: [],
                    }
                    try {
                        const res = await ledgerClient.post(
                            '/v2/commands/submit-and-wait',
                            request
                        )

                        notifier.emit('txChanged', {
                            status: 'executed',
                            commandId,
                            payload: res,
                        })

                        return res as unknown as ExecuteResult
                    } catch (error) {
                        throw new Error(
                            'Failed to submit transaction: ' + error
                        )
                    }
                }
                case SigningProvider.WALLET_KERNEL: {
                    const result = await ledgerClient.post(
                        '/v2/interactive-submission/execute',
                        {
                            userId,
                            preparedTransaction:
                                transaction?.preparedTransaction,
                            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
                            submissionId: commandId,
                            deduplicationPeriod: {
                                Empty: {},
                            },
                            partySignatures: {
                                signatures: [
                                    {
                                        party: partyId,
                                        signatures: [
                                            {
                                                signature,
                                                signedBy,
                                                format: 'SIGNATURE_FORMAT_RAW',
                                                signingAlgorithmSpec:
                                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                                            },
                                        ],
                                    },
                                ],
                            },
                        }
                    )

                    const signedTx: Transaction = {
                        commandId,
                        status: 'executed',
                        preparedTransaction: transaction.preparedTransaction,
                        preparedTransactionHash:
                            transaction.preparedTransactionHash,
                        payload: result,
                    }

                    store.setTransaction(signedTx)
                    notifier.emit('txChanged', signedTx)

                    return result as unknown as ExecuteResult
                }
                default:
                    throw new Error(
                        `Unsupported signing provider: ${wallet.signingProviderId}`
                    )
            }
        },
        listNetworks: async () =>
            Promise.resolve({ networks: await store.listNetworks() }),
        addSession: async function (
            params: AddSessionParams
        ): Promise<AddSessionResult> {
            try {
                await store.setSession({
                    network: params.chainId,
                    accessToken: authContext?.accessToken || '',
                })
                const network = await store.getCurrentNetwork()

                // Assumption: `setSession` calls `assertConnected`, so its safe to declare that the authContext is defined.
                const { userId, accessToken } = authContext!
                const notifier = notificationService.getNotifier(userId)

                notifier.emit('onConnected', {
                    kernel: kernelInfo,
                    sessionToken: accessToken,
                    chainId: network.chainId,
                })

                return Promise.resolve({
                    accessToken,
                    status: 'connected',
                    network: {
                        name: network.name,
                        chainId: network.chainId,
                        synchronizerId: network.synchronizerId,
                        description: network.description,
                        ledgerApi: network.ledgerApi,
                        auth: network.auth,
                    },
                })
            } catch (error) {
                logger.error(`Failed to add session: ${error}`)
                throw new Error(`Failed to add session: ${error}`)
            }
        },
        listSessions: async (): Promise<ListSessionsResult> => {
            const session = await store.getSession()
            if (!session) {
                return { sessions: [] }
            }
            const network = await store.getNetwork(session.network)
            return {
                sessions: [
                    {
                        accessToken: authContext!.accessToken,
                        status: 'connected',
                        network: {
                            name: network.name,
                            chainId: network.chainId,
                            synchronizerId: network.synchronizerId,
                            description: network.description,
                            ledgerApi: network.ledgerApi,
                            auth: network.auth,
                        },
                    },
                ],
            }
        },
    })
}
