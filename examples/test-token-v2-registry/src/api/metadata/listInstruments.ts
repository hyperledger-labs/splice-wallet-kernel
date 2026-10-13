// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard'
import { instruments } from './common'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'

/**
 * @returns API payload containing the full in-memory list of instrument metadata.
 */
export const listInstruments: TExpressOpenApiRequestHandler<
    OffLedger.MetadataV1.paths['/registry/metadata/v1/instruments']['get']
> = (_req, res) => {
    res.json({ instruments })
}
