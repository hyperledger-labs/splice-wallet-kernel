import { discover, popupHref } from 'core-wallet-ui-components'
import {
    injectSpliceProvider,
    ProviderType,
    SpliceProvider,
} from 'core-splice-provider'
import * as dappAPI from 'core-wallet-dapp-rpc-client'
import { SDK } from '../enums.js'
import { DiscoverResult, SpliceMessage, WalletEvent } from 'core-types'
export * from 'core-splice-provider'

const injectProvider = ({ walletType, url, sessionToken }: DiscoverResult) => {
    if (walletType === 'remote') {
        return injectSpliceProvider(
            ProviderType.HTTP,
            new URL(url),
            sessionToken
        )
    } else {
        return injectSpliceProvider(ProviderType.WINDOW)
    }
}

// On page load, restore and re-register the listener if needed
const connection = localStorage.getItem(SDK.LOCAL_STORAGE_KEY_CONNECTION)
if (connection) {
    try {
        injectProvider(DiscoverResult.parse(JSON.parse(connection)))
    } catch (e) {
        console.error('Failed to parse stored wallet connection:', e)
    }
}

const onConnected = (provider: SpliceProvider, result: DiscoverResult) => {
    provider.on<dappAPI.OnConnectedEvent>('onConnected', (event) => {
        console.log('SDK: Store connection')
        localStorage.setItem(
            SDK.LOCAL_STORAGE_KEY_CONNECTION,
            JSON.stringify({
                ...result,
                sessionToken: event.sessionToken,
            })
        )
    })
}

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
            const provider = injectProvider(result)

            // Listen for connected eved from the provider
            // This will be triggered when the user connects to the wallet kernel
            onConnected(provider, result)

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
