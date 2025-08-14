import { LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import * as sdk from 'splice-sdk-dapp'

@customElement('wallet-kernel-connector')
export class WalletKernelConnector extends LitElement {
    @state() accessor loading = false
    @state() accessor status = ''
    @state() accessor error = ''
    @state() accessor messages: string[] = []
    @state() accessor primaryParty: string | undefined = undefined
    @state() accessor accounts: sdk.dappAPI.RequestAccountsResult[] = []

    private messageListener = (event: unknown) => {
        this.messages = [...this.messages, JSON.stringify(event)]
    }

    private onConnected = (result: sdk.dappAPI.OnConnectedEvent) => {
        this.messageListener(result)
        this.status =
            `Wallet Kernel: ${result.kernel.id}, ` +
            `status: ${result.isConnected ? 'connected' : 'disconnected'}, ` +
            `chain: ${result.chainId}`
    }

    private onAccountsChanged = (
        wallets: sdk.dappAPI.AccountsChangedEvent[]
    ) => {
        this.messageListener(wallets)
        if (wallets.length > 0) {
            // @ts-expect-error reason TBS
            const primaryWallet = wallets.find((w) => w.primary)
            // @ts-expect-error reason TBS
            this.primaryParty = primaryWallet?.partyId
        } else {
            this.primaryParty = undefined
        }
    }

    private async onSdkConnect(): Promise<void> {
        const provider = window.splice
        if (!provider) {
            this.status = 'Splice provider not found'
            return
        }

        try {
            const result: sdk.dappAPI.StatusResult = await provider.request({
                method: 'status',
            })
            this.status =
                `Wallet Kernel: ${result.kernel.id}, ` +
                `status: ${result.isConnected ? 'connected' : 'disconnected'}, ` +
                `chain: ${result.chainId}`
        } catch {
            this.status = 'disconnected'
        }

        try {
            const wallets = await provider.request({
                method: 'requestAccounts',
            })
            const requestedAccounts =
                wallets as sdk.dappAPI.RequestAccountsResult[]
            this.accounts = requestedAccounts

            if (requestedAccounts?.length > 0) {
                // @ts-expect-error reason TBS
                const primaryWallet = requestedAccounts.find((w) => w.primary)
                // @ts-expect-error reason TBS
                this.primaryParty = primaryWallet?.partyId
            } else {
                this.primaryParty = undefined
            }
        } catch (err) {
            console.error('Error requesting wallets:', err)
            this.error = err instanceof Error ? err.message : String(err)
        }

        // subscribe
        provider.on('onConnected', this.onConnected)
        provider.on('txChanged', this.messageListener)
        provider.on('accountsChanged', this.onAccountsChanged)
    }

    disconnectedCallback() {
        const provider = window.splice
        if (provider) {
            provider.removeListener('onConnected', this.onConnected)
            provider.removeListener('txChanged', this.messageListener)
            provider.removeListener('accountsChanged', this.onAccountsChanged)
        }
        super.disconnectedCallback()
    }

    private connectToWalletKernel() {
        console.log('Connecting to Wallet Kernel...')
        sdk.connect()
            .then(({ kernel, isConnected, chainId }) => {
                console.log('connected', kernel, isConnected, chainId)
                void this.onSdkConnect()
            })
            .catch((err) => {
                console.error('Error setting status:', err)
            })
    }

    render() {
        return html`
            <div>Status: ${this.status}</div>
            ${this.error
                ? html`<div class="error">${this.error}</div>`
                : nothing}
            ${this.primaryParty
                ? html`<div>Primary party: ${this.primaryParty}</div>`
                : nothing}
            <pre>${this.messages.join('\n')}</pre>
            <button @click=${this.connectToWalletKernel}>
                Connect to wallet kernel
            </button>
        `
    }
}
