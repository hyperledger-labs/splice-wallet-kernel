// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/** `.env.local`, shared between `initialize`, `serve-paymaster`, `scan-topup` and the UI. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const envPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../.env.local'
)

async function readAll(): Promise<Record<string, string>> {
    const contents = await fs.readFile(envPath, 'utf-8').catch(() => '')
    const entries: Record<string, string> = {}
    for (const line of contents.split('\n')) {
        const match = /^([A-Z0-9_]+)=(.*)$/.exec(line)
        if (match) entries[match[1]] = match[2]
    }
    return entries
}

/** Sets one key, preserving whatever else is already in the file. */
export async function writeEnvVar(key: string, value: string): Promise<void> {
    const entries = await readAll()
    entries[key] = value
    const contents =
        Object.entries(entries)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n') + '\n'
    await fs.writeFile(envPath, contents)
}

export async function requireEnvVar(key: string): Promise<string> {
    const value = (await readAll())[key]
    if (!value) {
        throw new Error(`Missing ${key} in ${envPath}. Run "pnpm initialize" first.`)
    }
    return value
}
