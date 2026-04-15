// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TokenProviderConfig } from '@canton-network/core-wallet-auth'
import { AllowedLogAdapters } from '../../logger/types.js'
import { KeysNamespace } from '../../namespace/keys/index.js'
import { LedgerNamespace } from '../../namespace/ledger/index.js'
import { PartyNamespace } from '../../namespace/party/index.js'
import { UserNamespace } from '../../namespace/user/index.js'
import { SDKUtilsNamespace } from '../../utils/index.js'
import { AmuletNamespace } from '../../namespace/amulet/namespace.js'
import { AssetNamespace, TokenNamespace } from '../../sdk.js'
import { EventsNamespace } from '../../namespace/events/namespace.js'
import {
    AmuletConfig,
    AssetConfig,
    EventsConfig,
    TokenConfig,
} from './config.js'

// SDK OPTIONS

/**
 * Options for configuring the Wallet SDK instance.
 *
 * @property logAdapter Optional. Specifies which logging adapter to use for SDK logs.
 *   Allows integration with different logging backends (e.g., 'console', 'pino', or a custom adapter - see {@link CustomLogAdapter}).
 *   If not provided, a default adapter (pino) is used. This enables customization of log output and integration
 *   with application-wide logging strategies.
 */
export type BasicSDKOptions = Readonly<{
    auth: TokenProviderConfig
    ledgerClientUrl: string | URL
    websocketUrl?: string | URL // default to same host as ledgerClientUrl with ws protocol
    logAdapter?: AllowedLogAdapters
}>

export type ExtendedSDKOptions = Readonly<{
    amulet: AmuletConfig
    token: TokenConfig
    asset: AssetConfig
    events: EventsConfig
}>

export const EXTENDED_SDK_OPTION_KEYS = [
    'amulet',
    'token',
    'asset',
    'events',
] as const satisfies ReadonlyArray<keyof ExtendedSDKOptions>

// Compile-time validation that all keys from ExtendedSDKOptions are present in the tuple
type _ValidateAllKeysPresent =
    keyof ExtendedSDKOptions extends (typeof EXTENDED_SDK_OPTION_KEYS)[number]
        ? true
        : 'ERROR: Missing keys in EXTENDED_SDK_OPTION_KEYS'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _validateKeys: _ValidateAllKeysPresent = true

export type SDKOptions<ExtendedItems extends keyof ExtendedSDKOptions = never> =
    BasicSDKOptions & Pick<ExtendedSDKOptions, ExtendedItems>

// SDK INTERFACE

export type BasicSDKInterface = Readonly<{
    keys: KeysNamespace
    ledger: LedgerNamespace
    party: PartyNamespace
    user: UserNamespace
    utils: SDKUtilsNamespace
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
    [K in keyof Pick<
        ExtendedSDKOptions,
        ExtendedItems
    >]: ExtendedFullSDKInterface[K]
}

export type SDKInterface<
    ExtendedItems extends keyof ExtendedFullSDKInterface = never,
> = BasicSDKInterface & ExtendedSDKInterface<ExtendedItems>
