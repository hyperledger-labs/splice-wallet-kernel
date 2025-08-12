import { DiscoverResult } from 'core-types'
import * as dappAPI from 'core-wallet-dapp-rpc-client'

enum LOCAL_STORAGE {
    KERNEL_DISCOVERY = 'splice_wallet_kernel_discovery',
    KERNEL_SESSION = 'splice_wallet_kernel_session',
}

export const getKernelDiscovery = (): DiscoverResult | undefined => {
    const discovery = localStorage.getItem(LOCAL_STORAGE.KERNEL_DISCOVERY)
    if (discovery) {
        try {
            return DiscoverResult.parse(JSON.parse(discovery))
        } catch (e) {
            console.error('Failed to parse stored kernel discovery:', e)
        }
    }
    return undefined
}

export const setKernelDiscovery = (discovery: DiscoverResult): void => {
    localStorage.setItem(
        LOCAL_STORAGE.KERNEL_DISCOVERY,
        JSON.stringify(discovery)
    )
}

export const getKernelSession = (): dappAPI.OnConnectedEvent | undefined => {
    const session = localStorage.getItem(LOCAL_STORAGE.KERNEL_SESSION)
    if (session) {
        try {
            return JSON.parse(session) as dappAPI.OnConnectedEvent
        } catch (e) {
            console.error('Failed to parse stored kernel session:', e)
        }
    }
    return undefined
}

export const setKernelSession = (session: dappAPI.OnConnectedEvent): void => {
    localStorage.setItem(LOCAL_STORAGE.KERNEL_SESSION, JSON.stringify(session))
}

export const removeKernelSession = (): void => {
    localStorage.removeItem(LOCAL_STORAGE.KERNEL_SESSION)
}
