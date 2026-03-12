// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export class Env {
    static FIREBLOCKS_API_KEY = () => Env.get('FIREBLOCKS_API_KEY')
    static FIREBLOCKS_SECRET = () => Env.get('FIREBLOCKS_SECRET')
    static BLOCKDAEMON_API_URL = (fallback: string) =>
        Env.get('BLOCKDAEMON_API_URL', { fallback })
    static BLOCKDAEMON_API_KEY = (fallback: string) =>
        Env.get('BLOCKDAEMON_API_KEY', { fallback })

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
        const value = process.env[key] || fallback

        if (required && !value) {
            throw new Error(`Required environment variable (${key}) missing.`)
        }

        return value
    }
}
