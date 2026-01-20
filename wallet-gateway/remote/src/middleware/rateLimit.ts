// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import rateLimit from 'express-rate-limit'

export function rateLimiter(requestRateLimit: number) {
    return rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: requestRateLimit, // limit each IP to requestRateLimit requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
    })
}
