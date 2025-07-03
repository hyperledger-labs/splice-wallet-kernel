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

// Placeholder function -- replace with a real Signing API call
async function signingDriverCreate(
    store: Store,
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

            store.addWallet(wallet)
            return { wallet }
        }
        default:
            throw new Error(
                `Unsupported signing provider: ${signingProviderId}`
            )
    }
}

export const userController = (store: Store, ledgerClient: LedgerClient) =>
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
            const result = await signingDriverCreate(
                store,
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
