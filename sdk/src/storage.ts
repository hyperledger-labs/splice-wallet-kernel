import { DiscoverResult } from 'core-types'
import * as userApi from 'core-wallet-user-rpc-client'

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

export const getKernelSession = (): userApi.AddSessionResult | undefined => {
    const session = localStorage.getItem(LOCAL_STORAGE.KERNEL_SESSION)
    if (session) {
        try {
            return JSON.parse(session) as userApi.AddSessionResult
        } catch (e) {
            console.error('Failed to parse stored kernel session:', e)
        }
    }
    return undefined
}

export const setKernelSession = (session: userApi.AddSessionResult): void => {
    localStorage.setItem(LOCAL_STORAGE.KERNEL_SESSION, JSON.stringify(session))
}
