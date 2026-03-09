// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readRequiredMethods } from './openrpc'
import { jsonRpcRequest } from './rpc'
import type {
    Artifact,
    Profile,
    ProviderConfig,
    TestResult,
    TestStatus,
} from './schemas'

function nowIso(): string {
    return new Date().toISOString()
}

function duration(startMs: number): number {
    return Math.max(0, Date.now() - startMs)
}

function makeResult(
    id: string,
    title: string,
    category: TestResult['category'],
    status: TestStatus,
    elapsedMs: number,
    details?: string
): TestResult {
    return { id, title, category, status, elapsedMs, details }
}

async function runProtocolTests(
    provider: ProviderConfig
): Promise<TestResult[]> {
    const results: TestResult[] = []

    {
        const start = Date.now()
        const response = await jsonRpcRequest(provider, {
            jsonrpc: '2.0',
            id: 'protocol-unknown',
            method: '__cip103_unknown_method__',
            params: {},
        })
        const pass = response.error?.code === -32601
        results.push(
            makeResult(
                'CIP103-RPC-001',
                'Unknown method returns method-not-found',
                'protocol',
                pass ? 'pass' : 'fail',
                duration(start),
                pass
                    ? undefined
                    : `Expected -32601, got ${response.error?.code ?? 'no error'}`
            )
        )
    }

    {
        const start = Date.now()
        const response = await jsonRpcRequest(provider, { nonsense: true })
        const pass = Boolean(response.error)
        results.push(
            makeResult(
                'CIP103-RPC-002',
                'Invalid JSON-RPC request returns error',
                'protocol',
                pass ? 'pass' : 'fail',
                duration(start),
                pass
                    ? undefined
                    : 'Expected JSON-RPC error for malformed request'
            )
        )
    }

    return results
}

async function runSchemaTests(
    profile: Profile,
    provider: ProviderConfig
): Promise<TestResult[]> {
    const methodNames = await readRequiredMethods(profile)
    const results: TestResult[] = []

    for (const methodName of methodNames) {
        const start = Date.now()
        const response = await jsonRpcRequest(provider, {
            jsonrpc: '2.0',
            id: `schema-${methodName}`,
            method: methodName,
            params: {},
        })

        // For existence probing, anything except method-not-found counts as implemented.
        const pass = response.error?.code !== -32601
        results.push(
            makeResult(
                `CIP103-SCHEMA-${methodName}`,
                `Method '${methodName}' is implemented`,
                'schema',
                pass ? 'pass' : 'fail',
                duration(start),
                pass ? undefined : `Method returned -32601 (not found)`
            )
        )
    }

    return results
}

async function runBehaviorSmokeTests(
    profile: Profile,
    provider: ProviderConfig
): Promise<TestResult[]> {
    const start = Date.now()
    const response = await jsonRpcRequest(provider, {
        jsonrpc: '2.0',
        id: 'behavior-connect',
        method: 'connect',
        params: {},
    })

    const pass = response.error?.code !== -32601
    return [
        makeResult(
            profile === 'sync' ? 'CIP103-BEH-001' : 'CIP103-BEH-101',
            "Provider exposes 'connect' lifecycle method",
            'behavior',
            pass ? 'pass' : 'fail',
            duration(start),
            pass ? undefined : "'connect' method was not found"
        ),
    ]
}

function summarize(results: TestResult[]): Artifact['summary'] {
    const passed = results.filter((r) => r.status === 'pass').length
    const failed = results.filter((r) => r.status === 'fail').length
    const skipped = results.filter((r) => r.status === 'skip').length
    const total = results.length
    return {
        total,
        passed,
        failed,
        skipped,
        status: failed > 0 ? 'fail' : 'pass',
    }
}

export async function runConformance(
    profile: Profile,
    provider: ProviderConfig
): Promise<Artifact> {
    const [protocol, schema, behavior] = await Promise.all([
        runProtocolTests(provider),
        runSchemaTests(profile, provider),
        runBehaviorSmokeTests(profile, provider),
    ])
    const results = [...protocol, ...schema, ...behavior]
    return {
        schemaVersion: 1,
        suite: 'cip-103-conformance',
        profile,
        provider: {
            name: provider.name,
            version: provider.version,
            endpoint: provider.endpoint,
        },
        generatedAt: nowIso(),
        summary: summarize(results),
        results,
    }
}
