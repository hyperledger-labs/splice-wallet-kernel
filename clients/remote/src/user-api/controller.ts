// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LedgerClient } from 'core-ledger-client'
import buildController from './rpc-gen/index.js'
import {
    AddNetwork,
    AddNetworkParams,
    CreateWalletParams,
    CreateWalletResult,
    ExecuteParams,
    SignParams,
} from './rpc-gen/typings.js'
import { Store, Wallet } from 'core-wallet-store'
import pino from 'pino'
import {
    NotificationService,
    Notifier,
} from '../notification/NotificationService.js'
import { AuthContext } from 'core-wallet-auth'

// Placeholder function -- replace with a real Signing API call
async function signingDriverCreate(
    store: Store,
    notifier: Notifier | undefined,
    ledgerClient: LedgerClient,
    { signingProviderId, primary, partyHint, networkId }: CreateWalletParams
): Promise<CreateWalletResult> {
    switch (signingProviderId) {
        case 'participant': {
            const res = await ledgerClient.partiesPost({
                partyIdHint: partyHint,
            })

            const wallet: Wallet = {
                primary: primary ?? false,
                partyId: res.partyDetails.party,
                hint: partyHint,
                publicKey: 'placeholder-public-key',
                namespace: 'placeholder-namespace',
                signingProviderId: signingProviderId,
                networkId: networkId,
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
    store: Store,
    notificationService: NotificationService,
    authContext: AuthContext | undefined,
    ledgerClient: LedgerClient
) =>
    buildController({
        addNetwork: async (params: AddNetworkParams) =>
            Promise.resolve({} as AddNetwork),
        createWallet: async (params: {
            primary?: boolean
            partyHint: string
            networkId: string
            signingProviderId: string
        }) => {
            pino.pino().info(
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
        removeWallet: async (params: { partyId: string }) =>
            Promise.resolve({}),
        listWallets: async (params: {
            filter?: { networkIds?: string[]; signingProviderIds?: string[] }
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
        execute: async (params: ExecuteParams) =>
            Promise.resolve({
                correlationId: 'default-correlation-id',
                traceId: 'default-trace-id',
            }),
        listNetworks: async () =>
            Promise.resolve({ networks: await store.listNetworks() }),
    })
