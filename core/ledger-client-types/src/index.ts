// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * as v3_4 from './generated-clients/openapi-3.4.12.js'
export * from './generated-clients/asyncapi-3.4.12.js'
import * as Provider from './generated-clients/openapi-3.4.12-provider-types.js'
export * from './utils.js'

type Primitive = string | number | boolean | bigint | symbol | null | undefined

/**
 * Makes object properties recursively optional while preserving value unions.
 * Use this at consuming boundaries to stay compatible across spec patch versions.
 */
export type BackwardCompatible<T> = T extends Primitive
    ? T
    : T extends Array<infer U>
      ? Array<BackwardCompatible<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<BackwardCompatible<U>>
        : T extends object
          ? { [K in keyof T]?: BackwardCompatible<T[K]> }
          : T

export type LedgerTypes = Provider.LedgerTypes
export { Provider }
