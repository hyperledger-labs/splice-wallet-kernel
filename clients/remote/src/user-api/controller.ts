// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LedgerClient, SubmitAndWaitPostReq } from 'core-ledger-client'
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
    Null,
    SetPrimaryWalletParams,
} from './rpc-gen/typings.js'
import { Store, Wallet, Auth } from 'core-wallet-store'
import { Logger } from 'pino'
import {
    NotificationService,
    Notifier,
} from '../notification/NotificationService.js'
import { AuthContext } from 'core-wallet-auth'
import { KernelInfo } from '../config/Config.js'

// Placeholder function -- replace with a real Signing API call
async function signingDriverCreate(
    store: Store,
    notifier: Notifier | undefined,
    ledgerClient: LedgerClient,
    { signingProviderId, primary, partyHint, chainId }: CreateWalletParams
): Promise<CreateWalletResult> {
    switch (signingProviderId) {
        case 'participant': {
            const network = await store.getNetwork(chainId)

            const res = await ledgerClient.partiesPost({
                partyIdHint: partyHint,
                identityProviderId: '',
                synchronizerId: '',
                userId: '',
            })

            if (!res.partyDetails?.party) {
                throw new Error('Failed to allocate party')
            }

            const wallet: Wallet = {
                primary: primary ?? false,
                partyId: res.partyDetails.party,
                hint: partyHint,
                publicKey: 'placeholder-public-key',
                namespace: 'placeholder-namespace',
                signingProviderId: signingProviderId,
                chainId: chainId,
            }

            await store.addWallet(wallet)

            const wallets = await store.getWallets()
            notifier?.emit('accountsChanged', wallets)

            return { wallet }
        }
        default:
            throw new Error(
                `Unsupported signing provider: ${signingProviderId}`
            )
    }
}

export const userController = (
    kernelInfo: KernelInfo,
    store: Store,
    notificationService: NotificationService,
    authContext: AuthContext | undefined,
    ledgerClient: LedgerClient,
    _logger: Logger
) => {
    const logger = _logger.child({ component: 'user-controller' })
    return buildController({
        addNetwork: async (network: AddNetworkParams) => {
            const ledgerApi = {
                baseUrl: network.ledgerApiUrl ?? '',
            }
            const authType = network.auth.type

            let auth: Auth
            if (network.auth.type === 'implicit') {
                auth = {
                    type: 'implicit',
                    domain: network.auth.domain ?? '',
                    audience: network.auth.audience ?? '',
                    scope: network.auth.scope ?? '',
                    clientId: network.auth.clientId ?? '',
                }
            } else {
                auth = {
                    type: 'password',
                    tokenUrl: network.auth.tokenUrl ?? '',
                    grantType: network.auth.grantType ?? '',
                    scope: network.auth.scope ?? '',
                    clientId: network.auth.clientId ?? '',
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

            const notifier = authContext?.userId
                ? notificationService.getNotifier(authContext.userId)
                : undefined

            const result = await signingDriverCreate(
                store,
                notifier,
                ledgerClient,
                params
            )
            return result
        },
        setPrimaryWallet: function (
            params: SetPrimaryWalletParams
        ): Promise<Null> {
            store.setPrimaryWallet(params.partyId)
            const notifier = authContext?.userId
                ? notificationService.getNotifier(authContext.userId)
                : undefined
            notifier?.emit('accountsChanged', store.getWallets())
            return Promise.resolve(null)
        },
        removeWallet: async (params: { partyId: string }) =>
            Promise.resolve({}),
        listWallets: async (params: {
            filter?: { chainIds?: string[]; signingProviderIds?: string[] }
        }) => {
            // TODO: support filters
            return store.getWallets()
        },
        sign: async (params: SignParams) =>
            Promise.resolve({
                signature: 'default-signature',
                signedBy: 'default-signed-by',
                partyId: 'default-party',
            }),
        execute: async ({ commandId }: ExecuteParams) => {
            const wallet = await store.getPrimaryWallet()
            const network = await store.getCurrentNetwork()

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain -- we are certain userId is defined here because the store validates it
            const userId = authContext?.userId!
            const notifier = notificationService.getNotifier(userId)

            const transaction = await store.getTransaction(commandId)

            switch (wallet.signingProviderId) {
                case 'participant': {
                    // Participant signing provider specific logic can be added here
                    const request: SubmitAndWaitPostReq = {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
                        commands: transaction?.payload as any,
                        commandId,
                        userId,
                        actAs: [wallet.partyId],
                        readAs: [],
                        disclosedContracts: [],
                        synchronizerId: network.synchronizerId,
                        packageIdSelectionPreference: [],
                    }
                    try {
                        const res =
                            await ledgerClient.submitAndWaitPost(request)

                        notifier.emit('txChanged', {
                            status: 'executed',
                            commandId,
                            payload: res,
                        })
                    } catch (error) {
                        throw new Error(
                            'Failed to submit transaction: ' + error
                        )
                    }
                    break
                }
                default:
                    throw new Error(
                        `Unsupported signing provider: ${wallet.signingProviderId}`
                    )
            }

            return {
                correlationId: 'default-correlation-id',
                traceId: 'default-trace-id',
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
