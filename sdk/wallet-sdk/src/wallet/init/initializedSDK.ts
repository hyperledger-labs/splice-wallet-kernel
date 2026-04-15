// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { toURL } from '../common.js'
import { KeysNamespace } from '../namespace/keys/index.js'
import { LedgerNamespace } from '../namespace/ledger/index.js'
import { PartyNamespace } from '../namespace/party/index.js'
import { UserNamespace } from '../namespace/user/index.js'
import { TokenNamespace } from '../namespace/token/index.js'
import { AssetNamespace } from '../namespace/asset/index.js'
import { SDKContext } from '../sdk.js'
import { SDKUtilsNamespace } from '../utils/index.js'
import {
    AmuletConfig,
    AssetConfig,
    BasicSDKInterface,
    EventsConfig,
    ExtendedFullSDKInterface,
    ExtendedSDKOptions,
    TokenConfig,
} from './types/index.js'
import {
    ScanClient,
    ScanProxyClient,
    ValidatorInternalClient,
} from '@canton-network/core-splice-client'
import { AmuletService } from '@canton-network/core-amulet-service'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { SDKLogger } from '../logger/logger.js'
import { AmuletNamespace } from '../namespace/amulet/namespace.js'
import { EventsNamespace } from '../namespace/events/index.js'

const createNamespace: {
    [K in keyof ExtendedSDKOptions]: (
        ctx: SDKContext,
        config: ExtendedSDKOptions[K]
    ) => Promise<ExtendedFullSDKInterface[K]>
} = {
    amulet: async (ctx: SDKContext, config: AmuletConfig) => {
        const validatorUrl = toURL(config.validatorUrl, ctx.error)

        const auth = new AuthTokenProvider(config.auth, ctx.logger)
        const scanApiUrl = toURL(config.scanApiUrl, ctx.error)
        const scanProxyClient = new ScanProxyClient(
            validatorUrl,
            ctx.logger,
            auth
        )
        const scanClient = new ScanClient(scanApiUrl, ctx.logger, auth)
        const validatorParty = await getValidatorParty(
            validatorUrl,
            ctx.logger,
            auth
        )

        const tokenStandardService = new TokenStandardService(
            ctx.ledgerProvider,
            ctx.logger,
            auth,
            false
        )

        const amuletService = new AmuletService(
            tokenStandardService,
            scanProxyClient,
            scanClient
        )
        const registry = config.registryUrl

        return new AmuletNamespace({
            commonCtx: ctx,
            registry,
            amuletService,
            tokenStandardService,
            validatorParty,
        })
    },
    token: async (ctx: SDKContext, config: TokenConfig) => {
        const auth = new AuthTokenProvider(config.auth, ctx.logger)
        const tokenStandardService = new TokenStandardService(
            ctx.ledgerProvider,
            ctx.logger,
            auth,
            false
        )
        const validatorUrl = toURL(config.validatorUrl, ctx.error)

        const validatorParty = await getValidatorParty(
            validatorUrl,
            ctx.logger,
            auth
        )

        const registries = config.registries.map((registry) =>
            toURL(registry, ctx.error)
        )

        return new TokenNamespace({
            tokenStandardService,
            registryUrls: registries,
            validatorParty,
            commonCtx: ctx,
        })
    },
    asset: async (ctx: SDKContext, config: AssetConfig) => {
        const auth = new AuthTokenProvider(config.auth, ctx.logger)
        const tokenStandardService = new TokenStandardService(
            ctx.ledgerProvider,
            ctx.logger,
            auth,
            false
        )

        return new AssetNamespace({
            tokenStandardService,
            registries: config.registries,
            error: ctx.error,
            list: await tokenStandardService.registriesToAssets(
                config.registries.map((url) => url.href)
            ),
        })
    },
    events: async (ctx: SDKContext, config: EventsConfig) => {
        const auth = new AuthTokenProvider(config.auth, ctx.logger)
        return new EventsNamespace({
            commonCtx: ctx,
            auth,
            websocketURL: config.websocketURL,
        })
    },
}

export class InitializedSDK implements BasicSDKInterface {
    public readonly keys = new KeysNamespace()
    public readonly ledger: LedgerNamespace
    public readonly party: PartyNamespace
    public readonly user: UserNamespace
    public readonly utils: SDKUtilsNamespace

    constructor(protected ctx: SDKContext) {
        this.ledger = new LedgerNamespace(ctx)
        this.party = new PartyNamespace(ctx)
        this.user = new UserNamespace(ctx)
        this.utils = new SDKUtilsNamespace(ctx)
    }

    public async extend<ExtendedItems extends keyof ExtendedSDKOptions>(
        config: Pick<ExtendedSDKOptions, ExtendedItems>
    ) {
        return await ExtendedInitializedSDK.create(this.ctx, config)
    }
}

export class ExtendedInitializedSDK<
    ExtendedItems extends keyof ExtendedSDKOptions,
> extends InitializedSDK {
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
    ) {
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

        return new ExtendedInitializedSDK<ExtendedItems>(
            ctx,
            configuredItems,
            config
        )
    }

    public override async extend<NewItems extends keyof ExtendedSDKOptions>(
        config: Pick<ExtendedSDKOptions, NewItems>
    ) {
        return await ExtendedInitializedSDK.create<NewItems>(this.ctx, {
            ...this.config,
            ...config,
        })
    }
}

async function getValidatorParty(
    validatorUrl: URL,
    logger: SDKLogger,
    auth: AuthTokenProvider
) {
    const validator = new ValidatorInternalClient(validatorUrl, logger, auth)
    return (await validator.get('/v0/validator-user')).party_id
}
