import { SpliceProvider } from './SpliceProvider'

declare global {
    interface Window {
        splice?: SpliceProvider
        canton?: SpliceProvider
        ethereum?: SpliceProvider
    }
}

export function injectSpliceProvider(): SpliceProvider {
    // Check if the provider is already injected
    const existing = window.splice || window.canton || window.ethereum
    if (existing) return existing

    // Inject the SpliceProvider instance
    window.splice = new SpliceProvider()
    window.canton = window.splice // For compatibility with Canton dApps
    window.ethereum = window.splice // For EIP-1193 compatibility

    console.log('Splice provider injected successfully.')

    return window.splice
}

export * from './SpliceProvider'
