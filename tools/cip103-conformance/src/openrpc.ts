// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Profile } from './schemas'

interface OpenRpcMethod {
    name: string
}

interface OpenRpcDocument {
    methods?: OpenRpcMethod[]
}

function openRpcPath(profile: Profile): string {
    const moduleDir =
        typeof __dirname === 'string'
            ? __dirname
            : dirname(fileURLToPath(import.meta.url))
    const file =
        profile === 'sync'
            ? 'openrpc-dapp-api.json'
            : 'openrpc-dapp-remote-api.json'
    return resolve(moduleDir, '..', 'specs', file)
}

export async function readRequiredMethods(profile: Profile): Promise<string[]> {
    const path = openRpcPath(profile)
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as OpenRpcDocument
    const methods = parsed.methods?.map((m) => m.name).filter(Boolean) ?? []
    return [...new Set(methods)].sort((a, b) => a.localeCompare(b))
}
