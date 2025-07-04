import { discover, popupHref } from 'core-wallet-ui-components'
import { injectSpliceProvider, ProviderType } from 'core-splice-provider'
import * as dappAPI from 'core-wallet-dapp-rpc-client'
import { SDK } from '../enums.js'
import { DiscoverResult, SpliceMessage, WalletEvent } from 'core-types'
export * from 'core-splice-provider'

const injectProvider = ({ url, walletType }: DiscoverResult) => {
    if (walletType === 'remote') {
        return injectSpliceProvider(ProviderType.HTTP, new URL(url))
    } else {
        return injectSpliceProvider(ProviderType.WINDOW)
    }
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

// On page load, restore and re-register the listener if needed
const stored = localStorage.getItem(SDK.LOCAL_STORAGE_KEY_CONNECTION)
if (stored) {
    try {
        injectProvider(DiscoverResult.parse(JSON.parse(stored)))
    } catch (e) {
        console.error('Failed to parse stored wallet connection:', e)
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
            localStorage.setItem(
                SDK.LOCAL_STORAGE_KEY_CONNECTION,
                JSON.stringify(result)
            )
            const provider = injectProvider(result)
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
