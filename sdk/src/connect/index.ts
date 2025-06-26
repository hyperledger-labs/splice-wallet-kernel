import { discover, DiscoverResult, popupHref } from 'core-wallet-ui-components'
import {
    injectSpliceProvider,
    ProviderType,
    SpliceProvider,
} from 'core-splice-provider'
import * as dappAPI from 'core-wallet-dapp-rpc-client'
import { SDK } from '../enums.js'
export * from 'core-splice-provider'

const injectProvider = ({ url, walletType }: DiscoverResult) => {
    if (walletType === 'remote') {
        return injectSpliceProvider(ProviderType.HTTP, new URL(url))
    } else {
        return injectSpliceProvider(ProviderType.WINDOW)
    }
}

// On page load, restore and re-register the listener if needed
const stored = localStorage.getItem(SDK.LOCAL_STORAGE_KEY_CONNECTION)
if (stored) {
    try {
        injectProvider(JSON.parse(stored) as DiscoverResult)
    } catch (e) {
        console.error('Failed to parse stored wallet connection:', e)
    }
}

export enum ErrorCode {
    UserCancelled,
    Other,
}

type ConnectResult = {
    status: 'success'
    url: string
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}

export async function connect(): Promise<ConnectResult> {
    return discover()
        .then(async (result) => {
            let provider: SpliceProvider

            if (result) {
                localStorage.setItem(
                    SDK.LOCAL_STORAGE_KEY_CONNECTION,
                    JSON.stringify(result)
                )
                provider = injectProvider(result)

                const response = await provider.request<dappAPI.ConnectResult>({
                    method: 'connect',
                })
                await popupHref(new URL(response.userUrl!))
            }

            return {
                status: 'success',
                url: result.url,
            } as ConnectResult
        })
        .catch((err) => {
            throw {
                status: 'error',
                error: ErrorCode.Other,
                details: err instanceof Error ? err.message : String(err),
            } as ConnectError
        })
}
