// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Disabled unused vars rule to allow for future implementations

/* eslint-disable @typescript-eslint/no-unused-vars */
import { LedgerClient } from '@canton-network/core-ledger-client'
import buildController from './rpc-gen/index.js'
import {
    AddNetworkParams,
    RemoveNetworkParams,
    ExecuteParams,
    SignParams,
    AddSessionParams,
    AddSessionResult,
    ListSessionsResult,
    SetPrimaryWalletParams,
    SyncWalletsResult,
    CreateWalletParams,
} from './rpc-gen/typings.js'
import { Store, Transaction, Network } from '@canton-network/core-wallet-store'
import { Logger } from 'pino'
import { NotificationService } from '../notification/NotificationService.js'
import {
    AccessTokenProvider,
    assertConnected,
    AuthContext,
    authSchema,
    AuthTokenProvider,
} from '@canton-network/core-wallet-auth'
import { KernelInfo } from '../config/Config.js'
import {
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import {
    AllocatedParty,
    PartyAllocationService,
} from '../ledger/party-allocation-service.js'
import { WalletSyncService } from '../ledger/wallet-sync-service.js'
import { networkStatus } from '../utils.js'

type AvailableSigningDrivers = Partial<
    Record<SigningProvider, SigningDriverInterface>
>

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
        addNetwork: async (params: AddNetworkParams) => {
            const { network } = params

            const ledgerApi = {
                baseUrl: network.ledgerApi ?? '',
            }

            const auth = authSchema.parse(network.auth)
            const adminAuth = network.adminAuth
                ? authSchema.parse(network.adminAuth)
                : undefined

            const newNetwork: Network = {
                name: network.name,
                id: network.id,
                description: network.description,
                synchronizerId: network.synchronizerId,
                identityProviderId: network.identityProviderId,
                auth,
                adminAuth,
                ledgerApi,
            }

            // TODO: Add an explicit updateNetwork method to the User API spec and controller
            const existingNetworks = await store.listNetworks()
            if (existingNetworks.find((n) => n.id === newNetwork.id)) {
                await store.updateNetwork(newNetwork)
            } else {
                await store.addNetwork(newNetwork)
            }

            return null
        },
        removeNetwork: async (params: RemoveNetworkParams) => {
            await store.removeNetwork(params.networkName)
            return null
        },
        listNetworks: async () =>
            Promise.resolve({ networks: await store.listNetworks() }),
        listIdps: async () => Promise.resolve({ idps: await store.listIdps() }),
        createWallet: async (params: CreateWalletParams) => {
            logger.info(
                `Allocating party with params: ${JSON.stringify(params)}`
            )

            const {
                signingProviderId,
                signingProviderContext,
                primary,
                networkId,
                partyHint,
            } = params

            const userId = assertConnected(authContext).userId
            const notifier = notificationService.getNotifier(userId)
            const network = await store.getCurrentNetwork()

            if (network === undefined) {
                throw new Error('No network session found')
            }

            const idp = await store.getIdp(network.identityProviderId)

            const tokenProvider = new AuthTokenProvider(
                idp,
                network.auth,
                network.adminAuth,
                logger
            )
            const partyAllocator = new PartyAllocationService(
                network.synchronizerId,
                tokenProvider,
                network.ledgerApi.baseUrl,
                logger
            )
            const driver =
                drivers[signingProviderId as SigningProvider]?.controller(
                    userId
                )

            if (!driver) {
                throw new Error(
                    `Signing provider ${signingProviderId} not supported`
                )
            }

            let party: AllocatedParty
            let publicKey: string | undefined
            let txId: string = ''
            let walletStatus: string = 'allocated'
            let topologyTransactions: string[] = []

            switch (signingProviderId) {
                case SigningProvider.PARTICIPANT: {
                    party = await partyAllocator.allocateParty(
                        userId,
                        partyHint
                    )
                    break
                }
                case SigningProvider.WALLET_KERNEL: {
                    const key = await driver.createKey({
                        name: partyHint,
                    })

                    party = await partyAllocator.allocateParty(
                        userId,
                        partyHint,
                        key.publicKey,
                        async (hash) => {
                            const { signature } = await driver.signTransaction({
                                tx: '',
                                txHash: hash,
                                publicKey: key.publicKey,
                            })

                            return signature
                        }
                    )
                    publicKey = key.publicKey
                    break
                }
                case SigningProvider.FIREBLOCKS: {
                    const keys = await driver.getKeys()
                    const key = keys?.keys?.find(
                        (k) => k.name === 'Canton Party'
                    )
                    if (!key) throw new Error('Fireblocks key not found')

                    if (signingProviderContext) {
                        walletStatus = 'created'
                        const { signature, status } =
                            await driver.getTransaction({
                                userId,
                                txId: signingProviderContext.externalTxId,
                            })

                        if (!['pending', 'signed'].includes(status)) {
                            await store.removeWallet(
                                signingProviderContext.partyId
                            )
                        }

                        if (signature) {
                            await partyAllocator.allocatePartyWithExistingWallet(
                                signingProviderContext.namespace,
                                signingProviderContext.topologyTransactions.split(
                                    ', '
                                ),
                                Buffer.from(signature, 'hex').toString(
                                    'base64'
                                ),
                                userId
                            )
                            walletStatus = 'allocated'
                        }
                        party = {
                            partyId: signingProviderContext.partyId,
                            namespace: signingProviderContext.namespace,
                            hint: partyHint,
                        }
                    } else {
                        const formattedPublicKey = Buffer.from(
                            key.publicKey,
                            'hex'
                        ).toString('base64')
                        const namespace =
                            partyAllocator.createFingerprintFromKey(
                                formattedPublicKey
                            )
                        const transactions =
                            await partyAllocator.generateTopologyTransactions(
                                partyHint,
                                formattedPublicKey
                            )
                        topologyTransactions =
                            transactions.topologyTransactions!
                        let partyId = ''

                        const { status, txId: id } =
                            await driver.signTransaction({
                                tx: '',
                                txHash: Buffer.from(
                                    transactions.multiHash,
                                    'base64'
                                ).toString('hex'),
                                publicKey: key.publicKey,
                            })
                        if (status === 'signed') {
                            const { signature } = await driver.getTransaction({
                                userId,
                                txId: id,
                            })
                            partyId =
                                await partyAllocator.allocatePartyWithExistingWallet(
                                    namespace,
                                    transactions.topologyTransactions!,
                                    Buffer.from(signature, 'hex').toString(
                                        'base64'
                                    ),
                                    userId
                                )
                        } else {
                            txId = id
                            walletStatus = 'created'
                        }

                        party = {
                            partyId,
                            namespace,
                            hint: partyHint,
                        }
                    }
                    publicKey = key.publicKey
                    break
                }
                default:
                    throw new Error(
                        `Unsupported signing provider: ${signingProviderId}`
                    )
            }

            const { partyId, ...partyArgs } = party

            const wallet = {
                signingProviderId,
                networkId,
                primary: primary ?? false,
                publicKey: publicKey || partyArgs.namespace,
                externalTxId: txId,
                topologyTransactions: topologyTransactions?.join(', ') ?? '',
                status: walletStatus,
                partyId:
                    partyId !== ''
                        ? partyId
                        : `${partyArgs.hint}::${partyArgs.namespace}`,
                ...partyArgs,
            }

            if (signingProviderContext && walletStatus === 'allocated') {
                await store.updateWallet({
                    partyId: wallet.partyId,
                    status: wallet.status,
                })
            } else if (!signingProviderContext) {
                await store.addWallet(wallet)
            }

            const wallets = await store.getWallets()
            notifier?.emit('accountsChanged', wallets)

            return { wallet }
        },
        setPrimaryWallet: async (params: SetPrimaryWalletParams) => {
            await store.setPrimaryWallet(params.partyId)
            const notifier = authContext?.userId
                ? notificationService.getNotifier(authContext.userId)
                : undefined
            notifier?.emit('accountsChanged', await store.getWallets())
            return null
        },
        removeWallet: async (params: { partyId: string }) =>
            Promise.resolve({}),
        listWallets: async (params: {
            filter?: { networkIds?: string[]; signingProviderIds?: string[] }
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

            const userId = assertConnected(authContext).userId

            if (network === undefined) {
                throw new Error('No network session found')
            }

            const notifier = notificationService.getNotifier(userId)
            const signingProvider = wallet.signingProviderId as SigningProvider
            const driver = drivers[signingProvider]?.controller(userId)

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
                    const signature = await driver.signTransaction({
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

            const userId = assertConnected(authContext).userId

            if (network === undefined) {
                throw new Error('No network session found')
            }

            const notifier = notificationService.getNotifier(userId)

            // Create AccessTokenProvider for user token
            const userAccessTokenProvider: AccessTokenProvider = {
                getUserAccessToken: async () => authContext!.accessToken,
                getAdminAccessToken: async () => authContext!.accessToken,
            }

            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                logger,
                false,
                undefined,
                userAccessTokenProvider
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
                        const res = await ledgerClient.postWithRetry(
                            '/v2/commands/submit-and-wait',
                            request
                        )

                        notifier.emit('txChanged', {
                            status: 'executed',
                            commandId,
                            payload: res,
                        })

                        return res
                    } catch (error) {
                        throw new Error(
                            'Failed to submit transaction: ' + error
                        )
                    }
                }
                case SigningProvider.WALLET_KERNEL: {
                    const result = await ledgerClient.postWithRetry(
                        '/v2/interactive-submission/execute',
                        {
                            userId,
                            preparedTransaction:
                                transaction.preparedTransaction,
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
                                                format: 'SIGNATURE_FORMAT_CONCAT',
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

                    return result
                }
                default:
                    throw new Error(
                        `Unsupported signing provider: ${wallet.signingProviderId}`
                    )
            }
        },
        addSession: async function (
            params: AddSessionParams
        ): Promise<AddSessionResult> {
            try {
                await store.setSession({
                    network: params.networkId,
                    accessToken: authContext?.accessToken || '',
                })
                const network = await store.getCurrentNetwork()

                // Assumption: `setSession` calls `assertConnected`, so its safe to declare that the authContext is defined.
                const { userId, accessToken } = authContext!
                const notifier = notificationService.getNotifier(userId)

                const ledgerClient = new LedgerClient(
                    new URL(network.ledgerApi.baseUrl),
                    logger,
                    false,
                    accessToken
                )
                const status = await networkStatus(ledgerClient)
                notifier.emit('onConnected', {
                    status: {
                        kernel: kernelInfo,
                        isConnected: true,
                        isNetworkConnected: status.isConnected,
                        networkReason: status.reason ? status.reason : 'OK',
                        networkId: network.id,
                    },
                    sessionToken: accessToken,
                })

                return Promise.resolve({
                    accessToken,
                    network,
                    status: status.isConnected ? 'connected' : 'disconnected',
                    reason: status.reason ? status.reason : 'OK',
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
            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                logger,
                false,
                authContext!.accessToken
            )
            const status = await networkStatus(ledgerClient)
            return {
                sessions: [
                    {
                        network,
                        accessToken: authContext!.accessToken,
                        status: status.isConnected
                            ? 'connected'
                            : 'disconnected',
                        reason: status.reason ? status.reason : 'OK',
                    },
                ],
            }
        },
        syncWallets: async function (): Promise<SyncWalletsResult> {
            const network = await store.getCurrentNetwork()
            assertConnected(authContext)

            const userAccessTokenProvider: AccessTokenProvider = {
                getUserAccessToken: async () => authContext!.accessToken,
                getAdminAccessToken: async () => authContext!.accessToken,
            }

            const service = new WalletSyncService(
                store,
                new LedgerClient(
                    new URL(network.ledgerApi.baseUrl),
                    logger,
                    false,
                    undefined,
                    userAccessTokenProvider
                ),
                authContext!,
                logger
            )
            return await service.syncWallets()
        },
    })
}
