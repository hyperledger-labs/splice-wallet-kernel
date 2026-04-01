// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ConformanceTransport, JsonRpcResponse } from './transport'

export type Profile = 'sync' | 'async'
export type TestStatus = 'pass' | 'fail' | 'skip'

export type TestCategory = 'protocol' | 'schema' | 'behavior'

export type TestResult = {
    id: string
    title: string
    category: TestCategory
    status: TestStatus
    elapsedMs: number
    details?: string | undefined
}

export type ArtifactProvider = {
    name: string
    version: string
    transport: 'injected'
    appUrl?: string | undefined
}

export type ArtifactSummary = {
    total: number
    passed: number
    failed: number
    skipped: number
    status: 'pass' | 'fail'
}

export type Artifact = {
    schemaVersion: 1
    suite: 'cip-103-conformance'
    profile: Profile
    provider: ArtifactProvider
    generatedAt: string
    summary: ArtifactSummary
    results: TestResult[]
}

function nowIso(): string {
    return new Date().toISOString()
}

function duration(startMs: number): number {
    return Math.max(0, Date.now() - startMs)
}

function makeResult(
    id: string,
    title: string,
    category: TestCategory,
    status: TestStatus,
    elapsedMs: number,
    details?: string
): TestResult {
    return { id, title, category, status, elapsedMs, details }
}

export type ConformanceProviderMeta = {
    name: string
    version: string
    transport?: 'injected' | undefined
    appUrl?: string | undefined
}

function schemaProbeParams(methodName: string): unknown {
    // Some methods require non-empty params; probing them with {} can trigger
    // server-side errors that are artifacts of the test harness rather than the
    // provider implementation.
    switch (methodName) {
        case 'ledgerApi':
            return {
                requestMethod: 'get',
                resource: '/v2/version',
            }
        default:
            return {}
    }
}

function summarize(results: TestResult[]): ArtifactSummary {
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

export async function runConformanceAgainstConnectedProvider(args: {
    profile: Profile
    transport: ConformanceTransport
    requiredMethods: string[]
    providerMeta: ConformanceProviderMeta
    onProgress?:
        | ((event: {
              phase: 'protocol' | 'schema' | 'behavior' | 'finalize'
              current?: number | undefined
              total?: number | undefined
              message: string
              lastResult?: TestResult | undefined
              lastResponse?: JsonRpcResponse | null | undefined
          }) => void)
        | undefined
}): Promise<Artifact> {
    const { profile, transport, requiredMethods, providerMeta, onProgress } =
        args
    try {
        const results: TestResult[] = []

        onProgress?.({
            phase: 'protocol',
            message: 'Running protocol checks…',
        })
        {
            const start = Date.now()
            const response = await transport.request(
                '__cip103_unknown_method__',
                {}
            )
            const pass = response.error?.code === -32601
            const r = makeResult(
                'CIP103-RPC-001',
                'Unknown method returns method-not-found',
                'protocol',
                pass ? 'pass' : 'fail',
                duration(start),
                pass
                    ? undefined
                    : `Expected -32601, got ${response.error?.code ?? 'no error'}`
            )
            results.push(r)
            onProgress?.({
                phase: 'protocol',
                message: r.title,
                lastResult: r,
                lastResponse: response,
            })
        }

        {
            const start = Date.now()
            const response = await transport.requestInvalidEnvelope()
            if (!response) {
                const r = makeResult(
                    'CIP103-RPC-002',
                    'Invalid JSON-RPC request returns error',
                    'protocol',
                    'skip',
                    duration(start),
                    'Skipped: connected provider does not expose raw JSON-RPC envelope'
                )
                results.push(r)
                onProgress?.({
                    phase: 'protocol',
                    message: r.title,
                    lastResult: r,
                    lastResponse: null,
                })
            } else {
                const pass = Boolean(response.error)
                const r = makeResult(
                    'CIP103-RPC-002',
                    'Invalid JSON-RPC request returns error',
                    'protocol',
                    pass ? 'pass' : 'fail',
                    duration(start),
                    pass
                        ? undefined
                        : 'Expected JSON-RPC error for malformed request'
                )
                results.push(r)
                onProgress?.({
                    phase: 'protocol',
                    message: r.title,
                    lastResult: r,
                    lastResponse: response,
                })
            }
        }

        onProgress?.({
            phase: 'schema',
            current: 0,
            total: requiredMethods.length,
            message: `Checking method presence (${requiredMethods.length})…`,
        })
        let i = 0
        for (const methodName of requiredMethods) {
            onProgress?.({
                phase: 'schema',
                current: i,
                total: requiredMethods.length,
                message: `Requesting ${methodName}…`,
            })
            i += 1
            const start = Date.now()
            const response = await transport.request(
                methodName,
                schemaProbeParams(methodName)
            )
            const pass = response.error?.code !== -32601
            const r = makeResult(
                `CIP103-SCHEMA-${methodName}`,
                `Method '${methodName}' is implemented`,
                'schema',
                pass ? 'pass' : 'fail',
                duration(start),
                pass ? undefined : `Method returned -32601 (not found)`
            )
            results.push(r)
            onProgress?.({
                phase: 'schema',
                current: i,
                total: requiredMethods.length,
                message: `Checked ${methodName}`,
                lastResult: r,
                lastResponse: response,
            })
        }

        onProgress?.({
            phase: 'behavior',
            message: 'Running behavior smoke checks…',
        })
        {
            const start = Date.now()
            const response = await transport.request('connect', {})
            const pass = response.error?.code !== -32601
            const r = makeResult(
                profile === 'sync' ? 'CIP103-BEH-001' : 'CIP103-BEH-101',
                "Provider exposes 'connect' lifecycle method",
                'behavior',
                pass ? 'pass' : 'fail',
                duration(start),
                pass ? undefined : "'connect' method was not found"
            )
            results.push(r)
            onProgress?.({
                phase: 'behavior',
                message: r.title,
                lastResult: r,
                lastResponse: response,
            })
        }

        onProgress?.({
            phase: 'finalize',
            message: 'Finalizing report…',
        })
        return {
            schemaVersion: 1,
            suite: 'cip-103-conformance',
            profile,
            provider: {
                name: providerMeta.name,
                version: providerMeta.version,
                transport: 'injected',
                appUrl: providerMeta.appUrl,
            },
            generatedAt: nowIso(),
            summary: summarize(results),
            results,
        }
    } finally {
        await transport.close()
    }
}
