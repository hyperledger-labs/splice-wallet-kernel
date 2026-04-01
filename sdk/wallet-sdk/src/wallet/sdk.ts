// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WebSocketClient } from '@canton-network/core-asyncapi-client'
import {
    ScanClient,
    ScanProxyClient,
    ValidatorInternalClient,
} from '@canton-network/core-splice-client'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { AmuletService } from '@canton-network/core-amulet-service'
import {
    AuthTokenProvider,
    TokenProviderConfig,
} from '@canton-network/core-wallet-auth'
import { KeysClient } from './namespace/keys/index.js'
import { Ledger } from './namespace/ledger/index.js'
import { SDKLogger } from './logger/logger.js'
import { AllowedLogAdapters } from './logger/types.js'
import CustomLogAdapter from './logger/adapter/custom.js' // eslint-disable-line @typescript-eslint/no-unused-vars -- for JSDoc only
import { Asset } from './namespace/asset/index.js'
import { Amulet } from './namespace/amulet/index.js'
import { Token } from './namespace/token/index.js'
import { SDKErrorHandler } from './error/handler.js'
import {
    AbstractLedgerProvider,
    LedgerProvider,
} from '@canton-network/core-provider-ledger'
import { PartyId } from '@canton-network/core-types'
import Party from './namespace/party/client.js'
import { SdkUtils } from './utils/index.js'
import { AcsReader } from '@canton-network/core-acs-reader'
import { UserService } from './namespace/user/index.js'
import { Ops } from '@canton-network/core-provider-ledger'
export * from './namespace/asset/index.js'
export type * from './namespace/token/index.js'

export { type TokenProviderConfig } from '@canton-network/core-wallet-auth'

export { LedgerProvider } from '@canton-network/core-provider-ledger'

/**
 * Options for configuring the Wallet SDK instance.
 *
 * @property logAdapter Optional. Specifies which logging adapter to use for SDK logs.
 *   Allows integration with different logging backends (e.g., 'console', 'pino', or a custom adapter - see {@link CustomLogAdapter}).
 *   If not provided, a default adapter (pino) is used. This enables customization of log output and integration
 *   with application-wide logging strategies.
 */
export type WalletSdkOptions = {
    auth: TokenProviderConfig
    ledgerClientUrl: string | URL
    websocketUrl?: string | URL // default to same host as ledgerClientUrl with ws protocol
    readonly logAdapter?: AllowedLogAdapters
}

export type WalletSdkContext = {
    ledgerProvider: AbstractLedgerProvider
    asyncClient: WebSocketClient
    scanProxyClient: ScanProxyClient
    tokenStandardService: TokenStandardService
    amuletService: AmuletService
    userId: string
    registries: URL[]
    validatorParty: PartyId
    logger: SDKLogger
    error: SDKErrorHandler
    asset: Asset
    acsReader: AcsReader
    defaultSynchronizerId: string
}

export type CommonCtx = {
    ledgerProvider: AbstractLedgerProvider
    acsReader: AcsReader
    userId: string
    logger: SDKLogger
    error: SDKErrorHandler
    defaultSynchronizerId: string
}

export type AmuletConfig = {
    validatorUrl: string | URL
    scanApiUrl: string | URL
    auth: TokenProviderConfig
    registryUrl: URL
}

export type TokenConfig = {
    validatorUrl: string | URL
    auth: TokenProviderConfig
    registries: URL[]
}

export type AssetConfig = {
    auth: TokenProviderConfig
    registries: URL[]
}

export { PrepareOptions, ExecuteOptions } from './namespace/ledger/index.js'
export * from './namespace/transactions/prepared.js'
export * from './namespace/transactions/signed.js'

export type SDKInterface = {
    readonly keys: KeysClient
    readonly ledger: Ledger
    readonly party: Party
    readonly user: UserService
    readonly utils: SdkUtils

    amulet(config: AmuletConfig): Promise<Amulet>
    token(config: TokenConfig): Promise<Token>
    asset(config: AssetConfig): Promise<Asset>
}

export type SdkModuleFactory<
    TModule = unknown,
    TSdk = SDKInterface,
    TConfig = undefined,
> = (
    sdk: TSdk,
    config?: TConfig,
    modules?: SdkModuleLookup
) => TModule | Promise<TModule>

export type SdkModuleLookup = {
    hasModule(moduleKey: string): boolean
    getModule<TModule = unknown>(moduleKey: string): TModule | undefined
    requireModule<TModule = unknown>(moduleKey: string): TModule
}

export type SdkModuleDefinition<
    TModule = unknown,
    TSdk = SDKInterface,
    TConfig = undefined,
> = {
    readonly dependsOn?: readonly string[]
    readonly optionalDependsOn?: readonly string[]
    readonly validateConfig?: (config: TConfig) => void
    readonly create: SdkModuleFactory<TModule, TSdk, TConfig>
}

export type SdkModuleDefinitions = Record<
    string,
    SdkModuleDefinition<unknown, never, never>
>

type SdkModules<T extends SdkModuleDefinitions> = {
    readonly [K in keyof T]: Awaited<ReturnType<T[K]['create']>>
}

export type SdkModuleConfig<T extends SdkModuleDefinitions> = Partial<{
    [K in keyof T]: Parameters<T[K]['create']>[1]
}>

export type SdkModuleNamespaceFactories<TSdk = SDKInterface> = Record<
    string,
    (sdk: TSdk) => unknown | Promise<unknown>
>

export type SdkModuleNamespace<
    T extends Record<string, (...args: never[]) => unknown>,
> = {
    readonly [K in keyof T]: Awaited<ReturnType<T[K]>>
}

export function composeSdkModuleNamespace<
    TSdk,
    TModules extends SdkModuleNamespaceFactories<TSdk>,
>(modules: TModules): SdkModuleFactory<SdkModuleNamespace<TModules>, TSdk> {
    return async (sdk: TSdk) => {
        const entries = await Promise.all(
            Object.entries(modules).map(async ([key, factory]) => {
                return [key, await factory(sdk)] as const
            })
        )

        return Object.freeze(
            Object.fromEntries(entries)
        ) as SdkModuleNamespace<TModules>
    }
}

const RESERVED_SDK_MODULE_KEYS = new Set<string>([
    'keys',
    'ledger',
    'party',
    'user',
    'utils',
    'amulet',
    'token',
    'asset',
])

export class SDK {
    static async create<
        TModules extends SdkModuleDefinitions = Record<never, never>,
    >(
        input: WalletSdkOptions | AbstractLedgerProvider,
        options?: {
            modules?: TModules
            moduleConfig?: SdkModuleConfig<TModules>
        }
    ): Promise<SDKInterface & SdkModules<TModules>> {
        const sdk =
            'request' in input
                ? await createFromProvider(input)
                : await createFromConfig(input)

        return attachModules(sdk, options)
    }
}

async function attachModules<TModules extends SdkModuleDefinitions>(
    sdk: SDKInterface,
    options?: {
        modules?: TModules
        moduleConfig?: SdkModuleConfig<TModules>
    }
): Promise<SDKInterface & SdkModules<TModules>> {
    const modules = options?.modules

    if (!modules) {
        return sdk as SDKInterface & SdkModules<TModules>
    }

    const sdkRecord = sdk as SDKInterface & Record<string, unknown>

    for (const key of Object.keys(modules)) {
        if (key.includes('.')) {
            throw new Error(
                `Module key '${key}' is not allowed. Inject modules only at top-level and compose submodules under that namespace`
            )
        }

        if (RESERVED_SDK_MODULE_KEYS.has(key)) {
            throw new Error(
                `Cannot register SDK module '${key}' because the property already exists on SDK`
            )
        }
    }

    const moduleLookup: SdkModuleLookup = {
        hasModule(moduleKey: string) {
            return Object.prototype.hasOwnProperty.call(sdkRecord, moduleKey)
        },
        getModule<TModule = unknown>(moduleKey: string) {
            return sdkRecord[moduleKey] as TModule | undefined
        },
        requireModule<TModule = unknown>(moduleKey: string) {
            if (!Object.prototype.hasOwnProperty.call(sdkRecord, moduleKey)) {
                throw new Error(
                    `Required SDK module '${moduleKey}' is not registered`
                )
            }

            return sdkRecord[moduleKey] as TModule
        },
    }

    const moduleOrder = resolveModuleInitializationOrder(modules)
    const moduleConfigRecord =
        (options?.moduleConfig as Record<string, unknown> | undefined) ?? {}

    for (const key of moduleOrder) {
        const definition = modules[key] as SdkModuleDefinition<
            unknown,
            SDKInterface & SdkModules<TModules>,
            unknown
        >
        const config = moduleConfigRecord[key]

        definition.validateConfig?.(config)

        const module = await definition.create(
            sdk as SDKInterface & SdkModules<TModules>,
            config,
            moduleLookup
        )
        Object.defineProperty(sdk, key, {
            value: module,
            enumerable: true,
            configurable: false,
            writable: false,
        })
    }

    return sdk as SDKInterface & SdkModules<TModules>
}

function resolveModuleInitializationOrder(
    modules: SdkModuleDefinitions
): string[] {
    const order: string[] = []
    const state = new Map<string, 'visiting' | 'visited'>()

    const visit = (moduleKey: string, stack: string[]) => {
        const currentState = state.get(moduleKey)
        if (currentState === 'visited') {
            return
        }

        if (currentState === 'visiting') {
            const cycle = [...stack, moduleKey].join(' -> ')
            throw new Error(`Detected cyclic SDK module dependency: ${cycle}`)
        }

        const definition = modules[moduleKey]
        if (!definition) {
            throw new Error(
                `SDK module '${moduleKey}' is not registered but is required by another module`
            )
        }

        state.set(moduleKey, 'visiting')

        for (const dependency of definition.dependsOn ?? []) {
            if (!modules[dependency]) {
                throw new Error(
                    `SDK module '${moduleKey}' depends on missing module '${dependency}'`
                )
            }

            visit(dependency, [...stack, moduleKey])
        }

        for (const dependency of definition.optionalDependsOn ?? []) {
            if (modules[dependency]) {
                visit(dependency, [...stack, moduleKey])
            }
        }

        state.set(moduleKey, 'visited')
        order.push(moduleKey)
    }

    for (const moduleKey of Object.keys(modules)) {
        visit(moduleKey, [])
    }

    return order
}
export async function createFromConfig(
    options: WalletSdkOptions
): Promise<SDKInterface> {
    const logger = new SDKLogger(options.logAdapter ?? 'pino')

    const authTokenProvider = new AuthTokenProvider(options.auth, logger)

    const ledgerApiUrl = toURL(options.ledgerClientUrl)

    const ledgerProvider = new LedgerProvider({
        baseUrl: ledgerApiUrl,
        accessTokenProvider: authTokenProvider,
    })

    return createFromProvider(ledgerProvider)
}

export async function createFromProvider(
    provider: AbstractLedgerProvider
): Promise<SDKInterface> {
    const logger = new SDKLogger('pino')
    const error = new SDKErrorHandler(logger)

    const authenticatedUser =
        await provider.request<Ops.GetV2AuthenticatedUser>({
            method: 'ledgerApi',
            params: {
                requestMethod: 'get',
                resource: '/v2/authenticated-user',
                query: {},
            },
        })

    const userId = authenticatedUser.user?.id
    if (!userId) {
        throw new Error('Not an authenticated user')
    }

    const defaultSynchronizerId = await getDefaultSynchronizerId(
        provider,
        logger
    )

    const acsReader = new AcsReader(provider)

    const commonCtx: CommonCtx = {
        ledgerProvider: provider,
        acsReader,
        userId,
        logger,
        error,
        defaultSynchronizerId,
    }

    return {
        keys: new KeysClient(),
        ledger: new Ledger(commonCtx),
        party: new Party(commonCtx),
        user: new UserService(commonCtx),
        utils: new SdkUtils(commonCtx),
        async amulet(config: AmuletConfig): Promise<Amulet> {
            const validatorUrl = toURL(config.validatorUrl)

            const auth = new AuthTokenProvider(config.auth, logger)
            const scanApiUrl = toURL(config.scanApiUrl)
            const scanProxyClient = new ScanProxyClient(
                validatorUrl,
                logger,
                auth
            )
            const scanClient = new ScanClient(scanApiUrl, logger, auth)
            const validatorParty = await getValidatorParty(
                validatorUrl,
                logger,
                auth
            )

            const tokenStandardService = new TokenStandardService(
                provider,
                logger,
                auth,
                false
            )

            const amuletService = new AmuletService(
                tokenStandardService,
                scanProxyClient,
                scanClient
            )
            const registry = config.registryUrl

            return new Amulet({
                commonCtx,
                registry,
                amuletService,
                tokenStandardService,
                validatorParty,
            })
        },
        async token(config: TokenConfig): Promise<Token> {
            const auth = new AuthTokenProvider(config.auth, logger)
            const tokenStandardService = new TokenStandardService(
                provider,
                logger,
                auth,
                false
            )
            const validatorUrl = toURL(config.validatorUrl)

            const validatorParty = await getValidatorParty(
                validatorUrl,
                logger,
                auth
            )

            return new Token({
                tokenStandardService,
                registryUrls: config.registries,
                validatorParty,
                commonCtx,
            })
        },
        async asset(config: AssetConfig): Promise<Asset> {
            const auth = new AuthTokenProvider(config.auth, logger)
            const tokenStandardService = new TokenStandardService(
                provider,
                logger,
                auth,
                false
            )

            return new Asset({
                tokenStandardService,
                registries: config.registries,
                error,
                list: await tokenStandardService.registriesToAssets(
                    config.registries.map((url) => url.href)
                ),
            })
        },
    }
}

function toURL(input: string | URL): URL {
    return typeof input === 'string' ? new URL(input) : input
}

async function getDefaultSynchronizerId(
    provider: AbstractLedgerProvider,
    logger: SDKLogger
) {
    const connectedSynchronizers =
        await provider.request<Ops.GetV2StateConnectedSynchronizers>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/state/connected-synchronizers',
                requestMethod: 'get',
                query: {},
            },
        })

    if (!connectedSynchronizers.connectedSynchronizers?.[0]) {
        throw new Error('No connected synchronizers found')
    }

    const defaultSynchronizerId =
        connectedSynchronizers.connectedSynchronizers[0].synchronizerId
    if (connectedSynchronizers.connectedSynchronizers.length > 1) {
        logger.warn(
            `Found ${connectedSynchronizers.connectedSynchronizers.length} synchronizers, defaulting to ${defaultSynchronizerId}`
        )
    }

    return defaultSynchronizerId
}

async function getValidatorParty(
    validatorUrl: URL,
    logger: SDKLogger,
    auth: AuthTokenProvider
) {
    const validator = new ValidatorInternalClient(validatorUrl, logger, auth)
    return (await validator.get('/v0/validator-user')).party_id
}
