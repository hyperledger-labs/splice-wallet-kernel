// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TokenProviderConfig } from '@canton-network/core-wallet-auth'
import type { AllowedLogAdapters } from '../../logger/types.js'
import type { KeysNamespace } from '../../namespace/keys/index.js'
import type { LedgerNamespace } from '../../namespace/ledger/index.js'
import type { PartyNamespace } from '../../namespace/party/index.js'
import type { UserNamespace } from '../../namespace/user/index.js'
import type { SDKUtilsNamespace } from '../../namespace/utils/index.js'
import type { AmuletNamespace } from '../../namespace/amulet/namespace.js'
import type { AssetNamespace, TokenNamespace } from '../../sdk.js'
import type { EventsNamespace } from '../../namespace/events/namespace.js'
import type {
    AmuletConfig,
    AssetConfig,
    EventsConfig,
    TokenConfig,
} from './config.js'
import type { Provider } from '@canton-network/core-splice-provider'
import type { LedgerTypes } from '@canton-network/core-ledger-client-types'
import type { SDKPlugin, SDKPluginContext } from '../plugin.js'
import type { SynchronizerIdOption } from '../synchronizer.js'

// SDK OPTIONS

/**
 * Options for configuring the Wallet SDK instance.
 *
 * @property logAdapter Optional. Specifies which logging adapter to use for SDK logs.
 *   Allows integration with different logging backends (e.g., 'console', 'pino', or a custom adapter - see {@link CustomLogAdapter}).
 *   If not provided, a default adapter (pino) is used. This enables customization of log output and integration
 *   with application-wide logging strategies.
 * @property synchronizerId Optional. The synchronizer every call defaults to, either as an id or as a
 *   selector over the connected synchronizers. Required when the participant is connected to more than
 *   one synchronizer and calls do not pass a synchronizerId of their own.
 */
export type BasicSDKOptions<L extends LedgerTypes> = Readonly<
    {
        websocketUrl?: URL | string // default to same host as ledgerClientUrl with ws protocol
        logAdapter?: AllowedLogAdapters
        synchronizerId?: SynchronizerIdOption
    } & (
        | { auth: TokenProviderConfig; ledgerClientUrl: URL | string }
        | { ledgerProvider: Provider<L> }
    )
>

export const EXTENDED_SDK_OPTION_KEYS = [
    'amulet',
    'token',
    'asset',
    'events',
] as const

type EnforceKeys<
    K extends PropertyKey,
    T extends { [P in K | keyof T]: P extends K ? unknown : never },
> = T

export type ExtendedSDKOptions = EnforceKeys<
    (typeof EXTENDED_SDK_OPTION_KEYS)[number],
    Readonly<{
        amulet: AmuletConfig
        token: TokenConfig
        asset: AssetConfig
        events: EventsConfig
    }>
>

export type SDKOptions<ExtendedItems extends keyof ExtendedSDKOptions = never> =
    BasicSDKOptions<LedgerTypes> & Pick<ExtendedSDKOptions, ExtendedItems>

// Helper type to extract which extended options are present in an options object
export type GetExtendedKeys<T> = {
    [K in keyof ExtendedSDKOptions]: K extends keyof T
        ? undefined extends T[K]
            ? never
            : K
        : never
}[keyof ExtendedSDKOptions]

// SDK INTERFACE

export type BasicSDKInterface<
    CurrentlyExtended extends keyof ExtendedSDKOptions = never,
> = Readonly<{
    keys: KeysNamespace
    ledger: LedgerNamespace
    party: PartyNamespace
    user: UserNamespace
    utils: SDKUtilsNamespace
    extend: <ExtendedItems extends keyof ExtendedSDKOptions>(
        config: Pick<ExtendedSDKOptions, ExtendedItems>
    ) => Promise<SDKInterface<ExtendedItems | CurrentlyExtended>>
    registerPlugins: <
        /**
         * @deprecated `Record<string, PluginConstructor>` is deprecated. Use `PluginConstructor[]` instead.
         */
        P extends PluginConstructor[] | Record<string, PluginConstructor>,
    >(
        plugins: PluginRegistration<P>
    ) => SDKInterface<CurrentlyExtended> & RegisteredPlugins<P>
}>

export type ExtendedFullSDKInterface = Readonly<{
    amulet: AmuletNamespace
    token: TokenNamespace
    asset: AssetNamespace
    events: EventsNamespace
}>

export type NullableExtendedFullSDKInterface = {
    [K in keyof ExtendedFullSDKInterface]: ExtendedFullSDKInterface[K] | null
}

export type ExtendedSDKInterface<
    ExtendedItems extends keyof ExtendedSDKOptions,
> = {
    [
        K in keyof Pick<ExtendedSDKOptions, ExtendedItems>
    ]: ExtendedFullSDKInterface[K]
}

export type SDKInterface<
    ExtendedItems extends keyof ExtendedFullSDKInterface = never,
> = BasicSDKInterface<ExtendedItems> & ExtendedSDKInterface<ExtendedItems>

export type OfflineSDKInterface = Readonly<{
    keys: KeysNamespace
    utils: SDKUtilsNamespace
}>

// PLUGINS

export type PluginConstructor = new (ctx: SDKPluginContext) => SDKPlugin

/**
 * Represents the registration of plugins, either as an array of plugin constructors or as a record mapping names to plugin constructors.
 * Enforces use of SdkPlugin<'pluginName'> for plugins if used with array registration to enforce type safety.
 */
export type PluginRegistration<
    P extends PluginConstructor[] | Record<string, PluginConstructor>,
> = P &
    (P extends PluginConstructor[]
        ? string extends InstanceType<P[number]>['name']
            ? never
            : unknown
        : unknown)

export type RegisteredPlugins<
    /**
     * @deprecated `Record<string, PluginConstructor>` is deprecated. Use `PluginConstructor[]` instead.
     */
    P extends PluginConstructor[] | Record<string, PluginConstructor> =
        PluginConstructor[],
> = P extends PluginConstructor[]
    ? {
          [K in InstanceType<P[number]>['name']]: Extract<
              InstanceType<P[number]>,
              { name: K }
          >
      }
    : P extends Record<string, PluginConstructor>
      ? {
            [K in keyof P]: InstanceType<P[K]>
        }
      : never
