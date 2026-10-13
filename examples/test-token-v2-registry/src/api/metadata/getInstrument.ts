// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'
import { instruments } from './common'
import type { OffLedger } from '@canton-network/core-token-standard'
import { APIError } from '../common'

/**
 * Returns metadata for a single instrument identified by its instrument ID.
 *
 * @throws {404} When the instrument was not found.
 * @returns Instrument metadata.
 */
export const getInstrument: TExpressOpenApiRequestHandler<
    OffLedger.MetadataV1.paths['/registry/metadata/v1/instruments/{instrumentId}']['get']
> = (req, res) => {
    const instrumentId = req.params.instrumentId
    const instrument = instruments.find(
        (instrument) => instrument.id === instrumentId
    )
    if (!instrument) {
        throw new APIError(404, 'Instrument not found')
    }

    res.json(instrument)
}
