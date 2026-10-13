// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Pino does not support recursively redacting fields within objects of arbitrary depth,
 * so this helper function generates redactions up to depth N (default 6).
 * Supports both object nesting (.) and array access ([*]) at arbitrary depths.
 */
export function nestedRedact(keys: string[], depth: number = 5): string[] {
    return keys.flatMap((k) => {
        const key = k.includes('-') ? `["${k}"]` : k
        const redactions = []

        // Generate object-only nesting patterns (depth 0 to depth-1)
        for (let i = 0; i < depth; i++) {
            const prefix = Array.from({ length: i }).fill('*').join('.')
            if (prefix) {
                const fullKey = key.startsWith('["')
                    ? `${prefix}${key}`
                    : `${prefix}.${key}`
                redactions.push(fullKey)
            } else {
                redactions.push(key)
            }
        }

        // Generate array patterns: object nesting followed by array access
        for (let i = 0; i < depth; i++) {
            const prefix = Array.from({ length: i }).fill('*').join('.')
            const arrayPrefix = prefix ? `${prefix}.*[*]` : `*[*]`
            const fullKey = key.startsWith('["')
                ? `${arrayPrefix}${key}`
                : `${arrayPrefix}.${key}`
            redactions.push(fullKey)
        }

        return redactions
    })
}
