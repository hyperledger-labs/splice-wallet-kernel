// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Replaced at build time from package.json. See tsdown.config.ts.
declare const __DAPP_SDK_VERSION__: string

/** Published version of `@canton-network/dapp-sdk`. */
export const SDK_VERSION = __DAPP_SDK_VERSION__

export const DAPP_SDK_BUILD = Object.freeze({
    name: '@canton-network/dapp-sdk' as const,
    version: SDK_VERSION,
})

declare global {
    var __CANTON_DAPP_SDK__: typeof DAPP_SDK_BUILD | undefined
}

// Present on any page that loads the SDK, so a customer bundle can be
// identified from the console without a change in the dapp.
globalThis.__CANTON_DAPP_SDK__ = DAPP_SDK_BUILD
