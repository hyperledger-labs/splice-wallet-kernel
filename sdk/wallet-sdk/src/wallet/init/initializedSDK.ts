// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    AuthTokenProvider,
    type AccessTokenProvider,
} from '@canton-network/core-wallet-auth'
import { parseAssets, ParsedURL } from '../namespace/utils/url.js'
import { KeysNamespace } from '../namespace/keys/index.js'
import { LedgerNamespace } from '../namespace/ledger/index.js'
import { PartyNamespace } from '../namespace/party/index.js'
import { UserNamespace } from '../namespace/user/index.js'
import { TokenNamespace } from '../namespace/token/index.js'
import { AssetNamespace } from '../namespace/asset/index.js'
import {
    type OfflineSDKContext,
    type SDKContext,
    getValidatorParty,
} from '../sdk.js'
import { SDKUtilsNamespace } from '../namespace/utils/index.js'
import type {
    AmuletConfig,
    AssetConfig,
    BasicSDKInterface,
    EventsConfig,
    ExtendedFullSDKInterface,
    ExtendedSDKOptions,
    OfflineSDKInterface,
    PluginConstructor,
    PluginRegistration,
    RegisteredPlugins,
    SDKInterface,
    TokenConfig,
    RegistryAuth,
} from './types/index.js'
import { ScanClient, ScanProxyClient } from '@canton-network/core-splice-client'
import { AmuletService } from '@canton-network/core-amulet-service'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { AmuletNamespace } from '../namespace/amulet/namespace.js'
import { EventsNamespace } from '../namespace/events/index.js'

const noAuthProvider: AccessTokenProvider = {
    async getAccessToken() {
        return ''
    },
    async getAuthContext() {
        return { accessToken: '', userId: '' }
    },
}

const resolveAuth = (
    registryAuth: RegistryAuth | undefined,
    auth: AuthTokenProvider
): AccessTokenProvider => {
    if (registryAuth === 'none') {
        return noAuthProvider
    }
    if (registryAuth) {
        return new AuthTokenProvider(registryAuth)
    }
    return auth
}

const createNamespace: {
    [K in keyof ExtendedSDKOptions]: (
        ctx: SDKContext,
        config: ExtendedSDKOptions[K]
    ) => Promise<ExtendedFullSDKInterface[K]>
} = {
    amulet: async (ctx: SDKContext, config: AmuletConfig) => {
        const auth = new AuthTokenProvider(config.auth)

        const scanClient = new ScanClient(
            new ParsedURL(ctx, config.scanApiUrl),
            auth
        )
        const validatorParty = config.validatorUrl
            ? await getValidatorParty(
                  new ParsedURL(ctx, config.validatorUrl),
                  auth
              )
            : undefined

        const tokenStandardService = new TokenStandardService(
            ctx.ledgerProvider,
            resolveAuth(config.registryAuth, auth),
            false
        )

        // Keep validator-proxy behavior for existing Amulet configurations
        // that provide validatorUrl. Configurations without it use Scan
        // directly.
        const amuletService = config.validatorUrl
            ? new AmuletService(
                  tokenStandardService,
                  new ScanProxyClient(
                      new ParsedURL(ctx, config.validatorUrl),
                      auth
                  ),
                  scanClient
              )
            : new AmuletService(tokenStandardService, scanClient)

        return new AmuletNamespace({
            commonCtx: ctx,
            registry: new ParsedURL(ctx, config.registryUrl),
            amuletService,
            tokenStandardService,
            ...(validatorParty && { validatorParty }),
        })
    },
    token: async (ctx: SDKContext, config: TokenConfig) => {
        const auth = new AuthTokenProvider(config.auth)
        const tokenStandardService = new TokenStandardService(
            ctx.ledgerProvider,
            resolveAuth(config.registryAuth, auth),
            false
        )

        const registryUrls = config.registries.map(
            (input) => new ParsedURL(ctx, input)
        )

        const validatorParty = config.validatorUrl
            ? await getValidatorParty(
                  new ParsedURL(ctx, config.validatorUrl),
                  auth
              )
            : undefined

        return new TokenNamespace({
            tokenStandardService,
            registryUrls,
            commonCtx: ctx,
            ...(validatorParty && { validatorParty }),
        })
    },
    asset: async (ctx: SDKContext, config: AssetConfig) => {
        const auth = new AuthTokenProvider(config.auth)
        const tokenStandardService = new TokenStandardService(
            ctx.ledgerProvider,
            resolveAuth(config.registryAuth, auth),
            false
        )

        return new AssetNamespace({
            tokenStandardService,
            registries: config.registries.map(
                (input) => new ParsedURL(ctx, input)
            ),
            error: ctx.error,
            list: parseAssets(
                ctx,
                await tokenStandardService.registriesToAssets(
                    config.registries.map((c) => new ParsedURL(ctx, c))
                )
            ),
            commonCtx: ctx,
        })
    },
    events: async (ctx: SDKContext, config: EventsConfig) => {
        const auth = new AuthTokenProvider(config.auth)
        return new EventsNamespace({
            commonCtx: ctx,
            auth,
            websocketURL: new ParsedURL(ctx, config.websocketURL),
        })
    },
}

export class InitializedSDK<
    CurrentlyExtended extends keyof ExtendedSDKOptions = never,
> implements BasicSDKInterface<CurrentlyExtended> {
    public readonly keys = new KeysNamespace()
    public readonly ledger: LedgerNamespace
    public readonly party: PartyNamespace
    public readonly user: UserNamespace
    public readonly utils: SDKUtilsNamespace

    constructor(protected ctx: SDKContext) {
        this.ledger = new LedgerNamespace(ctx)
        this.party = new PartyNamespace(ctx)
        this.user = new UserNamespace(ctx)
        this.utils = new SDKUtilsNamespace({
            logger: ctx.logger,
            error: ctx.error,
        })
    }

    public async extend<ExtendedItems extends keyof ExtendedSDKOptions>(
        config: Pick<ExtendedSDKOptions, ExtendedItems>
    ): Promise<SDKInterface<CurrentlyExtended | ExtendedItems>> {
        return ExtendedInitializedSDK.create<ExtendedItems>(
            this.ctx,
            config
        ) as Promise<SDKInterface<CurrentlyExtended | ExtendedItems>>
    }

    public registerPlugins<
        /**
         * @deprecated `Record<string, PluginConstructor>` is deprecated. Use `PluginConstructor[]` instead.
         */
        P extends PluginConstructor[] | Record<string, PluginConstructor>,
    >(
        plugins: PluginRegistration<P>
    ): SDKInterface<CurrentlyExtended> & RegisteredPlugins<P> {
        if (Array.isArray(plugins)) {
            for (const pluginConstructor of plugins as PluginConstructor[]) {
                const plugin = new pluginConstructor({
                    ...this.ctx,
                    namespace: this,
                })
                if (!plugin.name || typeof plugin.name !== 'string') {
                    throw new Error(
                        'Plugin must define a valid non-empty string name.'
                    )
                }
                if (plugin.name in this) {
                    throw new Error(
                        `Plugin with name ${plugin.name} collides with an existing property on the SDK instance.`
                    )
                }
                Object.defineProperty(this, plugin.name, {
                    value: plugin,
                    writable: false,
                    enumerable: true,
                    configurable: false,
                })
            }
            /**
             * @deprecated use PluginConstructor[] instead.
             */
        } else {
            for (const [name, ctr] of Object.entries(plugins)) {
                const plugin = new ctr({
                    ...this.ctx,
                    namespace: this,
                })
                if (name in this) {
                    throw new Error(
                        `Plugin with name ${name} collides with an existing property on the SDK instance.`
                    )
                }
                Object.defineProperty(this, name, {
                    value: plugin,
                    writable: false,
                    enumerable: true,
                    configurable: false,
                })
            }
        }

        return this as SDKInterface<CurrentlyExtended> & RegisteredPlugins<P>
    }
}

export class OfflineInitializedSDK implements OfflineSDKInterface {
    public readonly utils: SDKUtilsNamespace
    public readonly keys = new KeysNamespace()
    constructor(protected ctx: OfflineSDKContext) {
        this.utils = new SDKUtilsNamespace(ctx)
    }
}

export class ExtendedInitializedSDK<
    ExtendedItems extends keyof ExtendedSDKOptions,
> extends InitializedSDK<ExtendedItems> {
    // Declare the dynamically assigned properties
    // These are set via Object.assign in the constructor
    declare readonly amulet: ExtendedItems extends 'amulet'
        ? AmuletNamespace
        : never
    declare readonly token: ExtendedItems extends 'token'
        ? TokenNamespace
        : never
    declare readonly asset: ExtendedItems extends 'asset'
        ? AssetNamespace
        : never
    declare readonly events: ExtendedItems extends 'events'
        ? EventsNamespace
        : never

    private constructor(
        protected ctx: SDKContext,
        private extendedInterface: Pick<
            ExtendedFullSDKInterface,
            ExtendedItems
        >,
        private config: Pick<ExtendedSDKOptions, ExtendedItems>
    ) {
        super(ctx)
        Object.assign(this, extendedInterface)
    }

    static async create<ExtendedItems extends keyof ExtendedSDKOptions>(
        ctx: SDKContext,
        config: Pick<ExtendedSDKOptions, ExtendedItems>
    ): Promise<SDKInterface<ExtendedItems>> {
        const configuredItems = {} as Pick<
            ExtendedFullSDKInterface,
            ExtendedItems
        >

        for (const item in config) {
            configuredItems[item] = await createNamespace[item](
                ctx,
                config[item]
            )
        }

        const instance = new ExtendedInitializedSDK<ExtendedItems>(
            ctx,
            configuredItems,
            config
        )
        // Type assertion needed: TypeScript can't verify that Object.assign
        // properly adds all extended properties to match SDKInterface
        return instance as SDKInterface<ExtendedItems>
    }

    public override async extend<NewItems extends keyof ExtendedSDKOptions>(
        config: Pick<ExtendedSDKOptions, NewItems>
    ) {
        const mergedConfig = {
            ...this.config,
            ...config,
        } as Pick<ExtendedSDKOptions, ExtendedItems | NewItems>

        return await super.extend(mergedConfig)
    }
}
