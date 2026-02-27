// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { loop } from '@fivenorth/loop-sdk'
import type {
    ProviderAdapterConfig,
    RequestArgs,
} from '@canton-network/core-types'
import type { Provider as SpliceProvider } from '@canton-network/core-splice-provider'
import { AbstractProvider } from '@canton-network/core-splice-provider'
import type {
    ProviderAdapter,
    WalletInfo,
} from '@canton-network/core-wallet-discovery'
import type {
    AccountsChangedEvent,
    ConnectResult,
    PrepareExecuteAndWaitResult,
    PrepareExecuteParams,
    ProviderId,
    ProviderType,
    RpcTypes as DappRpcTypes,
    Session,
    SignMessageResult,
    StatusEvent,
    TxChangedEvent,
    Wallet,
} from '@canton-network/core-wallet-dapp-rpc-client'

export type LoopNetwork = 'local' | 'devnet' | 'testnet' | 'mainnet'

interface LoopAccount {
    party_id: string
    auth_token?: string
    email?: string
    public_key?: string
}

interface LoopTxResult {
    command_id?: string
    update_id?: string
    status?: 'succeeded' | 'failed'
    error?: { error_message?: string }
}

interface LoopProvider {
    party_id: string
    getAuthToken?: (() => string) | undefined
    getAccount: () => Promise<LoopAccount>
    submitTransaction: (
        payload: unknown,
        options?: { executionMode?: 'async' | 'wait' }
    ) => Promise<unknown>
    submitAndWaitForTransaction: (
        payload: unknown,
        options?: { executionMode?: 'async' | 'wait' }
    ) => Promise<LoopTxResult>
    signMessage: (message: string) => Promise<unknown>
}

class LoopSDKProvider extends AbstractProvider<DappRpcTypes> {
    private readonly providerId: ProviderId
    private readonly baseUrl: string
    private readonly network: LoopNetwork
    private readonly appName: string

    private initialized = false
    private connected = false
    private loopProvider: LoopProvider | null = null
    private account: LoopAccount | null = null
    private connectPromise: Promise<ConnectResult> | null = null
    private resolveConnect: ((value: ConnectResult) => void) | null = null
    private rejectConnect: ((reason?: unknown) => void) | null = null

    constructor(config: {
        providerId: ProviderId
        baseUrl: string
        network: LoopNetwork
        appName: string
    }) {
        super()
        this.providerId = config.providerId
        this.baseUrl = config.baseUrl
        this.network = config.network
        this.appName = config.appName
    }

    async request<M extends keyof DappRpcTypes>(
        args: RequestArgs<DappRpcTypes, M>
    ): Promise<DappRpcTypes[M]['result']> {
        const method = args.method as keyof DappRpcTypes

        switch (method) {
            case 'connect':
                return (await this.connect()) as DappRpcTypes[M]['result']
            case 'status':
                return (await this.status()) as DappRpcTypes[M]['result']
            case 'disconnect':
                return (await this.disconnect()) as DappRpcTypes[M]['result']
            case 'listAccounts':
                return (await this.listAccounts()) as DappRpcTypes[M]['result']
            case 'getPrimaryAccount':
                return (await this.getPrimaryAccount()) as DappRpcTypes[M]['result']
            case 'getActiveNetwork':
                return {
                    networkId: this.network,
                    accessToken: this.account?.auth_token,
                } as DappRpcTypes[M]['result']
            case 'prepareExecute':
                return (await this.prepareExecute(
                    (args as RequestArgs<DappRpcTypes, 'prepareExecute'>).params
                )) as DappRpcTypes[M]['result']
            case 'prepareExecuteAndWait':
                return (await this.prepareExecuteAndWait(
                    (args as RequestArgs<DappRpcTypes, 'prepareExecuteAndWait'>)
                        .params
                )) as DappRpcTypes[M]['result']
            case 'signMessage':
                return (await this.signMessage(
                    (args as RequestArgs<DappRpcTypes, 'signMessage'>).params
                        .message
                )) as DappRpcTypes[M]['result']
            case 'ledgerApi':
                throw new Error(
                    'Loop provider does not support CIP-103 ledgerApi proxy requests'
                )
            case 'accountsChanged':
                return (await this.listAccounts()) as DappRpcTypes[M]['result']
            case 'txChanged':
                throw new Error(
                    'Use provider.on("txChanged", ...) for tx updates'
                )
            default:
                throw new Error(`Unsupported method "${String(method)}"`)
        }
    }

    private ensureInitialized(): void {
        if (this.initialized) return

        loop.init({
            appName: this.appName,
            network: this.network,
            walletUrl: this.baseUrl,
            apiUrl: this.baseUrl,
            options: {
                openMode: 'popup',
                requestSigningMode: 'popup',
            },
            onAccept: (provider) => {
                void this.handleAccept(provider as unknown as LoopProvider)
            },
            onReject: () => {
                this.handleReject(new Error('User rejected Loop connection'))
            },
            onTransactionUpdate: (payload) => {
                this.handleTransactionUpdate(payload as LoopTxResult)
            },
        })

        this.initialized = true
    }

    private async handleAccept(provider: LoopProvider): Promise<void> {
        this.loopProvider = provider
        this.connected = true

        try {
            this.account = (await provider.getAccount()) as LoopAccount
        } catch {
            const authToken =
                typeof provider.getAuthToken === 'function'
                    ? provider.getAuthToken()
                    : undefined
            this.account = {
                party_id: provider.party_id,
                ...(authToken ? { auth_token: authToken } : {}),
            }
        }

        const status = this.buildStatusEvent()
        this.emit<StatusEvent>('statusChanged', status)
        this.emit<AccountsChangedEvent>('accountsChanged', this.buildAccounts())

        if (this.resolveConnect) {
            this.resolveConnect(status.connection)
            this.clearPendingConnect()
        }
    }

    private handleReject(reason: unknown): void {
        if (this.rejectConnect) {
            this.rejectConnect(reason)
            this.clearPendingConnect()
        }
    }

    private clearPendingConnect(): void {
        this.connectPromise = null
        this.resolveConnect = null
        this.rejectConnect = null
    }

    private buildWallet(account: LoopAccount): Wallet {
        const partyId = account.party_id
        const namespace = partyId.includes('::')
            ? (partyId.split('::')[1] ?? 'loop')
            : 'loop'

        return {
            primary: true,
            partyId,
            status: 'allocated',
            hint: account.email ?? partyId,
            publicKey: account.public_key ?? '',
            namespace,
            networkId: this.network,
            signingProviderId: 'loop',
            disabled: false,
        }
    }

    private buildAccounts(): Wallet[] {
        if (!this.account) return []
        return [this.buildWallet(this.account)]
    }

    private buildStatusEvent(): StatusEvent {
        const session: Session | undefined = this.account?.auth_token
            ? {
                  accessToken: this.account.auth_token,
                  userId: this.account.email ?? this.account.party_id,
              }
            : undefined

        return {
            provider: {
                id: this.providerId,
                providerType: 'remote',
                url: this.baseUrl,
                userUrl: `${this.baseUrl}/.connect/`,
            },
            connection: {
                isConnected: this.connected,
                isNetworkConnected: this.connected,
            },
            network: {
                networkId: this.network,
                ...(this.account?.auth_token
                    ? { accessToken: this.account.auth_token }
                    : {}),
            },
            ...(session ? { session } : {}),
        }
    }

    private async connect(): Promise<ConnectResult> {
        this.ensureInitialized()

        if (this.connected) {
            return this.buildStatusEvent().connection
        }

        if (!this.connectPromise) {
            this.connectPromise = new Promise<ConnectResult>(
                (resolve, reject) => {
                    this.resolveConnect = resolve
                    this.rejectConnect = reject
                }
            )
        }

        await loop.connect()
        return this.connectPromise
    }

    private async status(): Promise<StatusEvent> {
        this.ensureInitialized()

        if (!this.connected) {
            try {
                await loop.autoConnect()
            } catch {
                // best-effort restore only
            }
        }

        return this.buildStatusEvent()
    }

    private async disconnect(): Promise<null> {
        loop.logout()
        this.connected = false
        this.loopProvider = null
        this.account = null
        this.emit<StatusEvent>('statusChanged', this.buildStatusEvent())
        this.emit<AccountsChangedEvent>('accountsChanged', [])
        this.clearPendingConnect()
        return null
    }

    private async listAccounts(): Promise<Wallet[]> {
        if (!this.loopProvider || !this.connected) return []

        if (!this.account) {
            this.account = (await this.loopProvider.getAccount()) as LoopAccount
        }
        return this.buildAccounts()
    }

    private async getPrimaryAccount(): Promise<Wallet> {
        const accounts = await this.listAccounts()
        if (!accounts[0]) {
            throw new Error('Loop wallet is not connected')
        }
        return accounts[0]
    }

    private toLoopPayload(params: PrepareExecuteParams): {
        commands: unknown[]
        disclosedContracts: unknown[]
        packageIdSelectionPreference?: string[] | undefined
        actAs?: string[] | undefined
        readAs?: string[] | undefined
        synchronizerId?: string | undefined
    } {
        return {
            commands: Array.isArray(params.commands)
                ? params.commands
                : [params.commands],
            disclosedContracts: params.disclosedContracts ?? [],
            packageIdSelectionPreference: params.packageIdSelectionPreference,
            actAs: params.actAs,
            readAs: params.readAs,
            synchronizerId: params.synchronizerId,
        }
    }

    private async prepareExecute(params: PrepareExecuteParams): Promise<null> {
        if (!this.loopProvider || !this.connected) {
            throw new Error('Loop wallet is not connected')
        }

        await this.loopProvider.submitTransaction(this.toLoopPayload(params), {
            executionMode: 'async',
        })
        return null
    }

    private async prepareExecuteAndWait(
        params: PrepareExecuteParams
    ): Promise<PrepareExecuteAndWaitResult> {
        if (!this.loopProvider || !this.connected) {
            throw new Error('Loop wallet is not connected')
        }

        const result = (await this.loopProvider.submitAndWaitForTransaction(
            this.toLoopPayload(params),
            {
                executionMode: 'wait',
            }
        )) as LoopTxResult

        if (result.status === 'failed') {
            throw new Error(
                result.error?.error_message ?? 'Loop transaction failed'
            )
        }

        return {
            tx: {
                status: 'executed',
                commandId:
                    result.command_id ?? params.commandId ?? 'loop-command',
                payload: {
                    updateId: result.update_id ?? '',
                    completionOffset: Date.now(),
                },
            },
        }
    }

    private async signMessage(message: string): Promise<SignMessageResult> {
        if (!this.loopProvider || !this.connected) {
            throw new Error('Loop wallet is not connected')
        }

        const result = await this.loopProvider.signMessage(message)
        const signatureValue =
            typeof result === 'object' &&
            result !== null &&
            'signature' in result
                ? (result as { signature: unknown }).signature
                : undefined
        const signature =
            typeof result === 'string'
                ? result
                : typeof signatureValue === 'string'
                  ? signatureValue
                  : String(result)

        return { signature }
    }

    private handleTransactionUpdate(payload: LoopTxResult): void {
        const commandId = payload.command_id ?? 'loop-command'

        if (payload.status === 'failed') {
            this.emit<TxChangedEvent>('txChanged', {
                status: 'failed',
                commandId,
            })
            return
        }

        if (payload.update_id) {
            this.emit<TxChangedEvent>('txChanged', {
                status: 'executed',
                commandId,
                payload: {
                    updateId: payload.update_id,
                    completionOffset: Date.now(),
                },
            })
            return
        }

        this.emit<TxChangedEvent>('txChanged', {
            status: 'pending',
            commandId,
        })
    }
}

export interface LoopAdapterConfig extends ProviderAdapterConfig {
    network: LoopNetwork
    providerId?: string | undefined
    icon?: string | undefined
    description?: string | undefined
    appName?: string | undefined
}

const LOOP_BASE_URLS: Record<LoopNetwork, string> = {
    local: 'http://localhost:3000',
    devnet: 'https://devnet.cantonloop.com',
    testnet: 'https://testnet.cantonloop.com',
    mainnet: 'https://cantonloop.com',
}

/**
 * ProviderAdapter for 5N Loop Wallet via @fivenorth/loop-sdk.
 */
export class LoopAdapter implements ProviderAdapter {
    readonly providerId: ProviderId
    readonly name: string
    readonly type: ProviderType = 'remote'
    readonly icon: string | undefined
    readonly rpcUrl: string

    private readonly description: string | undefined
    private readonly appName: string
    private readonly network: LoopNetwork
    private providerInstance: LoopSDKProvider | null = null

    constructor(config: LoopAdapterConfig) {
        this.providerId = config.providerId ?? 'loop'
        this.name = config.name
        this.network = config.network
        this.rpcUrl = LOOP_BASE_URLS[config.network]
        this.icon = config.icon
        this.description =
            config.description ??
            'Connect to 5N Loop Wallet via Loop SDK (.connect popup flow)'
        this.appName = config.appName ?? document.title ?? 'Canton dApp'
    }

    getInfo(): WalletInfo {
        return {
            providerId: this.providerId,
            name: this.name,
            type: this.type,
            description: this.description,
            icon: this.icon,
            url: this.rpcUrl,
        }
    }

    async detect(): Promise<boolean> {
        return typeof window !== 'undefined'
    }

    provider(): SpliceProvider<DappRpcTypes> {
        if (!this.providerInstance) {
            this.providerInstance = new LoopSDKProvider({
                providerId: this.providerId,
                baseUrl: this.rpcUrl,
                network: this.network,
                appName: this.appName,
            })
        }
        return this.providerInstance
    }

    teardown(): void {
        // Loop SDK manages popup lifecycle internally.
    }

    async restore(): Promise<SpliceProvider<DappRpcTypes> | null> {
        const provider = this.provider()
        const status = await provider.request({ method: 'status' })
        return status.connection.isConnected ? provider : null
    }
}
