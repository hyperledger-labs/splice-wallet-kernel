// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import packageJson from '../package.json' with { type: 'json' }
import type { Config } from './config.ts'
import {
    redact,
    type Report,
    type TestResult,
    type Observation,
} from './report.ts'
import {
    abortable,
    performInteraction,
    type TestProvider,
} from '@canton-network/core-provider-conformance'
import type { dappAPI } from '@canton-network/dapp-sdk'
import {
    describeError,
    isWalletError,
    requireCondition,
} from './tests/helpers.ts'
import { cases } from './tests/index.ts'
import type { TestRuntime } from './tests/types.ts'

export const TEST_CASE_COUNT = cases.length

type StatusResult = dappAPI.RpcTypes['status']['result']

export async function runSuite(options: {
    config: Config
    provider: TestProvider
    signal: AbortSignal
    onResult: (result: TestResult) => void
    onObservation: (observation: Observation) => void
    /**
     * Reports the request the suite is waiting on, with a callback that fails
     * its case right away. Lets a tester who already knows the wallet will not
     * answer move on without waiting out `timeoutMs`; the outcome is the same
     * as the timeout, including the reconnect that follows. Called with
     * `undefined` once nothing is outstanding.
     */
    onPendingRequest: (
        pending:
            | { testId: string; method: string; fail: () => void }
            | undefined
    ) => void
    /** Recreates the wallet session from scratch. Used to recover from a halted run instead of skipping the remaining tests. */
    reconnect: () => Promise<TestProvider>
}): Promise<Report> {
    const { config } = options
    let provider = options.provider
    let halted = false
    let wallet: StatusResult['provider'] | undefined
    const observations: Observation[] = []
    const tests: TestResult[] = []
    const start = Date.now()
    for (const testCase of cases) {
        const testStart = Date.now()
        const controller = new AbortController()
        const signal = AbortSignal.any([options.signal, controller.signal])

        const observe: TestRuntime['observe'] = (observation) => {
            if (signal.aborted) return
            let entry: Observation
            try {
                entry = redact({
                    ...observation,
                    testId: testCase.id,
                    timestamp: Date.now(),
                })
            } catch (error) {
                entry = {
                    testId: testCase.id,
                    timestamp: Date.now(),
                    method: observation.method,
                    error: describeError(error),
                }
            }
            observations.push(entry)
            options.onObservation(entry)
        }
        const failCase = () =>
            controller.abort(
                new Error(`${testCase.id} was marked as failed by the tester`)
            )
        /**
         * Announces the oldest outstanding request, so the UI can offer a way
         * out of one the wallet never answers. Entries are tracked by identity
         * because a case may have more than one request in flight.
         */
        const pending = new Set<{ method: string }>()
        const trackPending = async <T>(
            method: string,
            operation: Promise<T>
        ) => {
            const entry = { method }
            const announce = () => {
                const [oldest] = pending
                options.onPendingRequest(
                    oldest && {
                        testId: testCase.id,
                        method: oldest.method,
                        fail: failCase,
                    }
                )
            }
            pending.add(entry)
            announce()
            try {
                return await operation
            } finally {
                pending.delete(entry)
                announce()
            }
        }
        const request: TestRuntime['request'] = async (args) => {
            const { method } = args
            const params = 'params' in args ? args.params : undefined
            observe({ method, params })
            try {
                const result = await trackPending(
                    method,
                    abortable(provider.request(args), signal)
                )
                observe({ method, result })
                if (method === 'status') {
                    wallet = (result as StatusResult).provider
                }
                return result
            } catch (error) {
                observe({ method, error })
                throw error
            }
        }
        const runInteraction: TestRuntime['runInteraction'] = async (
            decision,
            args
        ) => {
            const { method } = args
            const params = 'params' in args ? args.params : undefined
            observe({ method, params })
            try {
                signal.throwIfAborted()
                const result = await trackPending(
                    method,
                    performInteraction(provider, decision, signal, args)
                )
                observe({ method, result })
                return result
            } catch (error) {
                if (!isWalletError(error)) halted = true
                observe({ method, error })
                throw error
            }
        }
        const ensureConnected: TestRuntime['ensureConnected'] = async () => {
            const { connection } = await request({ method: 'status' })
            if (connection.isConnected) return
            const result = await runInteraction('approve', {
                method: 'connect',
            })
            requireCondition(
                result.isConnected,
                'Setup connection was not approved'
            )
        }
        const ensureDisconnected: TestRuntime['ensureDisconnected'] =
            async () => {
                const { connection } = await request({ method: 'status' })
                if (connection.isConnected)
                    await request({ method: 'disconnect' })
            }
        const runtime: TestRuntime = {
            signal,
            request,
            runInteraction,
            observe,
            ensureConnected,
            ensureDisconnected,
            onEvent: (event, listener) => {
                signal.throwIfAborted()
                const eventProvider = provider
                eventProvider.on(event, listener)
                signal.addEventListener(
                    'abort',
                    () => eventProvider.removeListener(event, listener),
                    { once: true }
                )
            },
        }
        const { timeoutMs } = config
        const timer = setTimeout(
            () =>
                controller.abort(
                    new Error(`${testCase.id} timed out after ${timeoutMs}ms`)
                ),
            timeoutMs
        )
        const result: TestResult = {
            testId: testCase.id,
            name: testCase.name,
            status: 'passed',
            duration: 0,
            tags: [testCase.category],
        }
        try {
            if (config.disabledTests.includes(testCase.id)) {
                result.status = 'skipped'
            } else if (halted || signal.aborted) {
                result.status = 'skipped'
                result.message =
                    'Run stopped; wallet may still have a pending request'
            } else {
                await abortable(testCase.run(runtime), signal)
            }
        } catch (error) {
            result.status = 'failed'
            result.message = describeError(error)
            if (signal.aborted) halted = true
        } finally {
            pending.clear()
            options.onPendingRequest(undefined)
            clearTimeout(timer)
            controller.abort(new Error('Test finished'))
        }
        result.duration = Date.now() - testStart
        tests.push(result)
        options.onResult(result)
        if (halted && !options.signal.aborted) {
            try {
                provider = await options.reconnect()
                halted = false
            } catch {
                // Recovery failed; remaining tests stay skipped below.
            }
        }
    }
    const stop = Date.now()
    const count = (status: TestResult['status']) =>
        tests.filter((test) => test.status === status).length
    // Cannot use the ctrf-js library, they depend on node-specific APIs
    const report: Report = {
        reportFormat: 'CTRF',
        specVersion: '0.0.0',
        reportId: crypto.randomUUID(),
        timestamp: new Date(stop).toISOString(),
        results: {
            tool: { name: packageJson.name, version: packageJson.version },
            summary: {
                tests: tests.length,
                passed: count('passed'),
                failed: count('failed'),
                skipped: count('skipped'),
                pending: 0,
                other: 0,
                start,
                stop,
            },
            tests,
        },
        extra: {
            provider: {
                type: config.provider.type,
                ...(wallet ? { wallet } : {}),
            },
            wrapper: config.wrapper.type,
            disabledTests: config.disabledTests,
            diagnostics: { observations },
        },
    }
    return report
}
