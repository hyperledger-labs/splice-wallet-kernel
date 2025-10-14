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
    ListWalletsResult,
    SyncWalletsResult,
} from './rpc-gen/typings.js'
import { Store, Auth, Transaction } from '@canton-network/core-wallet-store'
import { Logger } from 'pino'
import { NotificationService } from '../notification/NotificationService.js'
import {
    AuthContext,
    clientCredentialsService,
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
        addNetwork: async (network: AddNetworkParams) => {
            const ledgerApi = {
                baseUrl: network.ledgerApiUrl ?? '',
            }

            let auth: Auth
            if (network.auth.type === 'implicit') {
                auth = {
                    type: 'implicit',
                    identityProviderId: network.auth.identityProviderId,
                    issuer: network.auth.issuer ?? '',
                    configUrl: network.auth.configUrl ?? '',
                    audience: network.auth.audience ?? '',
                    scope: network.auth.scope ?? '',
                    clientId: network.auth.clientId ?? '',
                }
            } else {
                auth = {
                    type: 'password',
                    identityProviderId: network.auth.identityProviderId,
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

            const adminToken = await clientCredentialsService(
                network.auth.configUrl,
                logger
            ).fetchToken({
                clientId: network.auth.admin.clientId,
                clientSecret: network.auth.admin.clientSecret,
                scope: network.auth.scope,
                audience: network.auth.audience,
            })

            logger.debug(
                { adminToken },
                'Fetched admin token for party allocation'
            )

            const partyAllocator = new PartyAllocationService(
                network.synchronizerId,
                adminToken,
                network.ledgerApi.baseUrl,
                logger
            )
            const driver = drivers[
                params.signingProviderId as SigningProvider
            ]?.controller(authContext.userId)

            if (!driver) {
                throw new Error(
                    `Signing provider ${params.signingProviderId} not supported`
                )
            }

            let party: AllocatedParty
            let publicKey: string | undefined

            switch (params.signingProviderId) {
                case SigningProvider.PARTICIPANT: {
                    party = await partyAllocator.allocateParty(
                        userId,
                        params.partyHint
                    )
                    break
                }
                case SigningProvider.WALLET_KERNEL: {
                    const key = await driver.createKey({
                        name: params.partyHint,
                    })

                    party = await partyAllocator.allocateParty(
                        userId,
                        params.partyHint,
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
                default:
                    throw new Error(
                        `Unsupported signing provider: ${params.signingProviderId}`
                    )
            }

            const wallet = {
                signingProviderId: params.signingProviderId,
                chainId: params.chainId,
                primary: params.primary ?? false,
                publicKey: publicKey || party.namespace,
                ...party,
            }

            await store.addWallet(wallet)

            const wallets = await store.getWallets()
            notifier?.emit('accountsChanged', wallets)

            return { wallet }
        },
        setPrimaryWallet: async (params: SetPrimaryWalletParams) => {
            store.setPrimaryWallet(params.partyId)
            const notifier = authContext?.userId
                ? notificationService.getNotifier(authContext.userId)
                : undefined
            notifier?.emit('accountsChanged', await store.getWallets())
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
            const driver = drivers[signingProvider]?.controller(
                authContext.userId
            )

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

            if (authContext === undefined || network === undefined) {
                throw new Error('Unauthenticated context')
            }

            const userId = authContext.userId
            const notifier = notificationService.getNotifier(userId)

            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
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

                        return res
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
        syncWallets: async function (): Promise<SyncWalletsResult> {
            const network = await store.getCurrentNetwork()
            if (authContext === undefined) {
                logger.error(
                    'No auth context, cannot start wallet sync service'
                )
                throw new Error('Unauthenticated context')
            }
            const service = new WalletSyncService(
                store,
                new LedgerClient(
                    new URL(network.ledgerApi.baseUrl),
                    authContext.accessToken,
                    logger
                ),
                authContext,
                logger
            )
            return await service.syncWallets()
        },
    })
}
