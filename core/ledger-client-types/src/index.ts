// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * as v3_5 from './generated-clients/openapi-3.5.10.js'
export * as v3_6 from './generated-clients/openapi-3.6.0.js'
export * as v3_5_async from './generated-clients/asyncapi-3.5.10.js'
export * as v3_6_async from './generated-clients/asyncapi-3.6.0.js'
import * as V3_5_provider from './generated-clients/openapi-3.5.10-provider-types.js'
import * as V3_6_provider from './generated-clients/openapi-3.6.0-provider-types.js'
import * as openapi_v3_5 from './generated-clients/openapi-3.5.10.js'
import * as openapi_v3_6 from './generated-clients/openapi-3.6.0.js'
import * as asyncapi_v3_5 from './generated-clients/asyncapi-3.5.10.js'
import * as asyncapi_v3_6 from './generated-clients/asyncapi-3.6.0.js'
import {
    getPaths as getPaths_v3_5,
    postPaths as postPaths_v3_5,
} from './generated-clients/openapi-3.5.10-paths.js'
import {
    getPaths as getPaths_v3_6,
    postPaths as postPaths_v3_6,
} from './generated-clients/openapi-3.6.0-paths.js'

export * from './utils.js'

export const supportedLedgerApiVersions = ['3.5', '3.6'] as const
export type LedgerApiVersion = (typeof supportedLedgerApiVersions)[number]

export const supportedAsyncApiVersions = ['3.5', '3.6'] as const
export type AsyncApiVersion = (typeof supportedAsyncApiVersions)[number]

export const ledgerApiByVersion = {
    '3.5': openapi_v3_5,
    '3.6': openapi_v3_6,
} as const

export const asyncApiByVersion = {
    '3.5': asyncapi_v3_5,
    '3.6': asyncapi_v3_6,
} as const

export type LedgerSchemasByVersion = {
    '3.5': openapi_v3_5.components['schemas']
    '3.6': openapi_v3_6.components['schemas']
}

export type LedgerPathsByVersion = {
    '3.5': openapi_v3_5.paths
    '3.6': openapi_v3_6.paths
}

// Includes keys from both types and unions values for shared keys
type Union<A, B> = {
    [K in keyof A | keyof B]:
        | (K extends keyof A ? A[K] : never)
        | (K extends keyof B ? B[K] : never)
}

export type LedgerCommonSchemas = Union<
    LedgerSchemasByVersion['3.5'],
    LedgerSchemasByVersion['3.6']
>

export type LedgerCommonPaths = Union<
    LedgerPathsByVersion['3.5'],
    LedgerPathsByVersion['3.6']
>

export type AsyncChannelsByVersion = {
    '3.5': typeof asyncapi_v3_5.CHANNELS
    '3.6': typeof asyncapi_v3_6.CHANNELS
}

export type AsyncCommonChannels = Union<
    AsyncChannelsByVersion['3.5'],
    AsyncChannelsByVersion['3.6']
>

export type LedgerTypes = V3_5_provider.LedgerTypes | V3_6_provider.LedgerTypes
export * as Provider from './generated-clients/openapi-3.6.0-provider-types.js'
export { V3_5_provider as V3_5Provider }
export { V3_6_provider as V3_6Provider }

export const LedgerGetRoutes = new Set<string>([
    ...getPaths_v3_5,
    ...getPaths_v3_6,
])

export const LedgerPostRoutes = new Set<string>([
    ...postPaths_v3_5,
    ...postPaths_v3_6,
])

export type RawCommandMap = {
    ExerciseCommand: LedgerCommonSchemas['ExerciseCommand']
    CreateCommand: LedgerCommonSchemas['CreateCommand']
    CreateAndExerciseCommand: LedgerCommonSchemas['CreateAndExerciseCommand']
}

export type WrappedCommand<
    K extends keyof RawCommandMap = keyof RawCommandMap,
> = {
    [P in K]: { [Q in P]: RawCommandMap[P] }
}[K]
