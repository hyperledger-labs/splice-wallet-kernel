import { discover } from 'core-wallet-ui-components'
import { injectSpliceProvider, ProviderType } from 'core-splice-provider'
import * as dappAPI from 'core-wallet-dapp-rpc-client'
import { SDK } from '../enums.js'
import { DiscoverResult } from 'core-types'
import { DappServer } from '../dapp-api/server.js'
export * from 'core-splice-provider'

let dappServer: DappServer | undefined = undefined

const injectProvider = ({ walletType, url }: DiscoverResult) => {
    // Stop the previous DappServer if it exists
    dappServer?.stop()

    if (walletType === 'remote') {
        dappServer = new DappServer(new URL(url))
        dappServer.run()
        return injectSpliceProvider(ProviderType.WINDOW)
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
            const response = await provider.request<dappAPI.ConnectResult>({
                method: 'connect',
            })

            console.log('SDK: Store connection')
            localStorage.setItem(
                SDK.LOCAL_STORAGE_KEY_CONNECTION,
                JSON.stringify({
                    ...result,
                    sessionToken: response.sessionToken,
                })
            )

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
