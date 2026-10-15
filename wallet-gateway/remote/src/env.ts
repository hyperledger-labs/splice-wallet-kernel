// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export class Env {
    static get(
        key: string,
        options: { required?: boolean; fallback: string }
    ): string
    static get(
        key: string,
        options: { required: true; fallback?: string }
    ): string
    static get(
        key: string,
        options?: { required?: boolean; fallback?: string } | undefined
    ): string | undefined
    static get(
        key: string,
        options?: { required?: boolean; fallback?: string } | undefined
    ): string | undefined {
        const { fallback, required } = options || {}
        const value = process.env[key]?.trim() || fallback?.trim()

        if (required && !value) {
            throw new Error(`Required environment variable (${key}) missing.`)
        }

        return value
    }
}
