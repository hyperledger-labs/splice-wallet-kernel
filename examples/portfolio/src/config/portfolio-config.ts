// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ZodError } from 'zod'
import { portfolioConfigSchema, type PortfolioConfig } from '@lib/schemas'

const DEFAULT_CONFIG_URL = '/config.json'

const formatConfigError = (error: ZodError): string =>
    error.issues
        .map((issue) => {
            const path = issue.path.length > 0 ? issue.path.join('.') : '<root>'
            return `${path}: ${issue.message}`
        })
        .join('; ')

export const loadPortfolioConfig = async (
    configUrl = DEFAULT_CONFIG_URL
): Promise<PortfolioConfig> => {
    const response = await fetch(configUrl, { cache: 'no-store' })

    if (!response.ok) {
        throw new Error(
            `Failed to load portfolio config from ${configUrl}: ${response.status} ${response.statusText}`
        )
    }

    let rawConfig: unknown
    try {
        rawConfig = await response.json()
    } catch (error) {
        throw new Error(
            `Invalid JSON in portfolio config from ${configUrl}: ${String(error)}`,
            { cause: error }
        )
    }

    const result = portfolioConfigSchema.safeParse(rawConfig)
    if (!result.success) {
        throw new Error(
            `Invalid portfolio config from ${configUrl}: ${formatConfigError(result.error)}`
        )
    }

    return result.data
}
