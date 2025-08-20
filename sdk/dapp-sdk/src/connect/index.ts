import { discover, popupHref } from '@splice/core-wallet-ui-components'
import {
    injectSpliceProvider,
    ProviderType,
} from '@splice/core-splice-provider'
import * as dappAPI from '@splice/core-wallet-dapp-rpc-client'
import * as storage from '../storage'
import { DiscoverResult, SpliceMessage, WalletEvent } from '@splice/core-types'
export * from '@splice/core-splice-provider'

const injectProvider = ({ walletType, url }: DiscoverResult) => {
    if (walletType === 'remote') {
        return injectSpliceProvider(
            ProviderType.HTTP,
            new URL(url),
            storage.getKernelSession()?.sessionToken
        )
    } else {
        return injectSpliceProvider(ProviderType.WINDOW)
    }
}

// On page load, restore and re-register the listener if needed
const discovery = storage.getKernelDiscovery()
if (discovery) injectProvider(discovery)

const openKernelUserUI = (
    walletType: DiscoverResult['walletType'],
    userUrl: string
) => {
    switch (walletType) {
        case 'remote':
            popupHref(new URL(userUrl))
            break
        case 'extension': {
            const msg: SpliceMessage = {
                type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
                url: userUrl,
            }
            window.postMessage(msg, '*')
            break
        }
    }
}

export enum ErrorCode {
    UserCancelled,
    Other,
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}

export async function connect(): Promise<dappAPI.ConnectResult> {
    return discover()
        .then(async (result) => {
            // Store discovery result and remove previous session
            storage.setKernelDiscovery(result)
            storage.removeKernelSession()
            const provider = injectProvider(result)

            // Listen for connected event from the provider
            // This will be triggered when the user connects to the wallet kernel
            provider.on<dappAPI.OnConnectedEvent>('onConnected', (event) => {
                console.log('SDK: Store connection', event)
                storage.setKernelSession(event)
            })

            const response = await provider.request<dappAPI.ConnectResult>({
                method: 'connect',
            })

            if (!response.isConnected)
                openKernelUserUI(result.walletType, response.userUrl)

            return response
        })
        .catch((err) => {
            throw {
                status: 'error',
                error: ErrorCode.Other,
                details: err instanceof Error ? err.message : String(err),
            } as ConnectError
        })
}
