// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import rateLimit from 'express-rate-limit'

export const rpcRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: process.env.CI ? 10000 : 100, // limit each IP to 100 requests per windowMs, more when running in CI
    standardHeaders: true,
    legacyHeaders: false,
})
