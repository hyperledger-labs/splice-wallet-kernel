import { SpliceProvider } from './SpliceProvider'
import { SpliceProviderHttp } from './SpliceProviderHttp'
import { SpliceProviderWindow } from './SpliceProviderWindow'

declare global {
    interface Window {
        splice?: SpliceProvider
        canton?: SpliceProvider
        ethereum?: SpliceProvider
    }
}

export enum ProviderType {
    WINDOW,
    HTTP,
}

export function injectSpliceProvider(
    providerType: ProviderType,
    url?: URL,
    sessionToken?: string
): SpliceProvider {
    // Check if the provider is already injected
    const existing = window.splice || window.canton || window.ethereum
    if (existing) return existing

    // Inject the SpliceProvider instance
    if (providerType === ProviderType.WINDOW) {
        window.splice = new SpliceProviderWindow()
    } else if (providerType === ProviderType.HTTP) {
        if (!url || !(url instanceof URL)) {
            throw new Error(
                'Invalid URL for HTTP provider. Please provide a valid URL instance.'
            )
        }
        window.splice = new SpliceProviderHttp(url, sessionToken)
    } else {
        throw new Error(
            'Invalid provider type. Use ProviderType.WINDOW or ProviderType.HTTP.'
        )
    }

    window.canton = window.splice // For compatibility with Canton dApps
    window.ethereum = window.splice // For EIP-1193 compatibility

    console.log('Splice provider injected successfully.')

    return window.splice
}

export * from './SpliceProvider'
