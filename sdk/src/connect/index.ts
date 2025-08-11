import { discover } from 'core-wallet-ui-components'
import { injectSpliceProvider, ProviderType } from 'core-splice-provider'
import * as dappAPI from 'core-wallet-dapp-rpc-client'
import { DiscoverResult } from 'core-types'
import { DappServer } from '../dapp-api/server.js'
export * from 'core-splice-provider'
import * as storage from '../storage.js'

let dappServer: DappServer | undefined = undefined

const injectProvider = ({ walletType, url }: DiscoverResult) => {
    // Stop the previous DappServer if it exists
    dappServer?.stop()

    if (walletType === 'remote') {
        const rpcUrl = new URL(url)
        dappServer = new DappServer(rpcUrl)
        return injectSpliceProvider(
            ProviderType.HTTP,
            rpcUrl,
            storage.getKernelSession()?.accessToken
        )
    } else {
        return injectSpliceProvider(ProviderType.WINDOW)
    }
}

// On page load, restore and re-register the listener if needed
const discovery = storage.getKernelDiscovery()
if (discovery) injectProvider(discovery)

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
            storage.setKernelDiscovery(result)

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
