// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type MockedObject, vi } from 'vitest'
import type {
    AmuletConfig,
    AssetConfig,
    BasicSDKOptions,
    EventsConfig,
    TokenConfig,
    TokenProviderConfig,
} from '../sdk.js'
import type { SDKLogger } from '../logger/logger.js'
import { SDKErrorHandler } from '../error/handler.js'
import type { OfflineSDKContext, SDKContext } from '../init/types/context.js'

const exampleLink = 'http://example.com'

export const ledgerProvider = {
    request: vi.fn().mockResolvedValue(undefined),
}

export const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
    additionalContext: {},
    adapter: { log: vi.fn() },
    allowedAdapter: 'pino' as const,
} as unknown as MockedObject<SDKLogger>

const mockErrorHandler = new SDKErrorHandler(mockLogger)
const throwSpy = vi.spyOn(mockErrorHandler, 'throw')
throwSpy.mockImplementation(vi.fn() as never)

export const ctx: SDKContext = {
    ledgerProvider,
    userId: 'userId',
    logger: mockLogger,
    error: mockErrorHandler,
    defaultSynchronizerId: '',
}

export const offlineCtx: OfflineSDKContext = {
    logger: mockLogger,
    error: mockErrorHandler,
}

export const tokenProviderConfig: TokenProviderConfig = {
    method: 'static',
    token: 'token',
}

export const basicSDKOptions: BasicSDKOptions<never> = {
    auth: tokenProviderConfig,
    ledgerClientUrl: exampleLink,
}

export const amuletConfig: AmuletConfig = {
    validatorUrl: exampleLink,
    scanApiUrl: exampleLink,
    auth: tokenProviderConfig,
    registryUrl: exampleLink,
}

export const tokenConfig: TokenConfig = {
    validatorUrl: exampleLink,
    auth: tokenProviderConfig,
    registries: [exampleLink, exampleLink],
}

export const assetConfig: AssetConfig = {
    auth: tokenProviderConfig,
    registries: [exampleLink, exampleLink],
}

export const eventsConfig: EventsConfig = {
    websocketURL: exampleLink,
    auth: tokenProviderConfig,
}
