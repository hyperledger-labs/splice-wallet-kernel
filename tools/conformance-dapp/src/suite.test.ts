// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DappSDK } from '@canton-network/dapp-sdk'
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto'
import packageJson from '../package.json' with { type: 'json' }
import { validateStrict } from 'ctrf'
import { ConfigSchema, defaultConfig as defaultRunConfig } from './config.ts'
import { runSuite as runFullSuite, TEST_CASE_COUNT } from './suite.ts'
import { cases } from './tests/index.ts'
import {
    redact,
    runPassed,
    signReport,
    reportHash,
    serializeReport,
    signReportWithWallet,
    SignatureSchema,
} from './report.ts'
import { WrappingTestProvider } from '@canton-network/core-provider-conformance'
import { providerErrors } from '@canton-network/core-rpc-errors'
import {
    createProvider,
    type Provider,
} from '@canton-network/core-provider-conformance'

const errorHandlingTestIds = [
    'request.unknownMethod',
    'signMessage.missingParams',
    'signMessage.invalidParams',
    'prepareExecute.missingParams',
    'prepareExecute.invalidParams',
]
const nonErrorHandlingTestIds = cases
    .filter((testCase) => !errorHandlingTestIds.includes(testCase.id))
    .map((testCase) => testCase.id)

type SuiteOptions = Parameters<typeof runFullSuite>[0]
const runSuite = (
    options: Pick<SuiteOptions, 'config' | 'provider'> & Partial<SuiteOptions>
) =>
    runFullSuite({
        signal: new AbortController().signal,
        onResult: () => {},
        onObservation: () => {},
        onPendingRequest: () => {},
        reconnect: async () => {
            throw new Error('Reconnect not supported')
        },
        ...options,
    })

const walletKeys = generateKeyPairSync('ed25519')
/** Raw 32-byte hex, one of the forms `importPublicKey` accepts. */
const walletPublicKey = Buffer.from(
    walletKeys.publicKey.export({ format: 'jwk' }).x!,
    'base64url'
).toString('hex')
const signWithWallet = (message: string) =>
    sign(null, Buffer.from(message), walletKeys.privateKey).toString('base64')

/** Carries every field the dApp API's Wallet schema marks as required. */
const fakeAccount = {
    primary: true,
    partyId: 'test-party',
    status: 'initialized',
    hint: 'test-wallet',
    publicKey: walletPublicKey,
    namespace: 'test-namespace',
    networkId: 'canton:test',
    signingProviderId: 'participant',
}

const defaultConfig = ConfigSchema.parse({
    ...defaultRunConfig,
    provider: {
        type: 'extension',
        target: 'sync-test-wallet',
    },
    wrapper: { type: 'manual' },
})

describe('Conformance suite', () => {
    afterEach(() => vi.restoreAllMocks())

    it.each(['success', 'failure', 'timeout', 'cancellation'] as const)(
        'cleans up test event listeners on %s',
        async (outcome) => {
            const { wrapper } = fakeWallet()
            const onEvent = vi.spyOn(wrapper, 'on')
            const removeListener = vi.spyOn(wrapper, 'removeListener')
            const listener = vi.fn()
            const controller = new AbortController()
            const testCase = cases[0]
            let subscribeAfterCompletion!: () => void
            vi.spyOn(testCase, 'run').mockImplementation(async (runtime) => {
                runtime.onEvent('txChanged', listener)
                subscribeAfterCompletion = () =>
                    runtime.onEvent('txChanged', listener)
                if (outcome === 'failure') throw new Error('Test failure')
                if (outcome === 'cancellation') controller.abort()
                if (outcome === 'timeout' || outcome === 'cancellation')
                    await new Promise(() => {})
            })
            const report = await runSuite({
                config: {
                    ...defaultConfig,
                    timeoutMs: 10,
                    disabledTests: cases.slice(1).map((test) => test.id),
                },
                provider: wrapper,
                signal: controller.signal,
                onResult: () => {
                    expect(removeListener).toHaveBeenCalledExactlyOnceWith(
                        'txChanged',
                        listener
                    )
                },
            })
            expect(report.results.tests[0].status).toBe(
                outcome === 'success' ? 'passed' : 'failed'
            )
            expect(subscribeAfterCompletion).toThrow()
            expect(onEvent).toHaveBeenCalledExactlyOnceWith(
                'txChanged',
                listener
            )
        }
    )

    it('fails the case a tester gives up on without waiting for its timeout', async () => {
        const { wrapper } = fakeWallet()
        const [stuck, next] = cases
        vi.spyOn(wrapper, 'request').mockReturnValue(new Promise(() => {}))
        vi.spyOn(stuck, 'run').mockImplementation(async (runtime) => {
            await runtime.request({ method: 'status' })
        })
        vi.spyOn(next, 'run').mockResolvedValue()
        const reconnect = vi.fn(async () => wrapper)
        const announced: (string | undefined)[] = []
        const report = await runSuite({
            // A budget this test could never wait out, so only `fail` can end it.
            config: {
                ...defaultConfig,
                timeoutMs: 600000,
                disabledTests: cases.slice(2).map((test) => test.id),
            },
            provider: wrapper,
            reconnect,
            onPendingRequest: (pending) => {
                announced.push(pending && `${pending.testId}:${pending.method}`)
                pending?.fail()
            },
        })
        expect(report.results.tests.slice(0, 2)).toMatchObject([
            {
                testId: stuck.id,
                status: 'failed',
                message: `${stuck.id} was marked as failed by the tester`,
            },
            { testId: next.id, status: 'passed' },
        ])
        // The wallet may still hold the abandoned request, so the halted run
        // recovers the same way it does after a timeout.
        expect(reconnect).toHaveBeenCalledOnce()
        // The unanswered request is announced once, then cleared.
        expect(announced[0]).toBe(`${stuck.id}:status`)
        expect(announced.slice(1).every((entry) => entry === undefined)).toBe(
            true
        )
    })

    it('SDK-facing provider configuration does not require an API variant', () => {
        for (const provider of [
            { type: 'picker' },
            { type: 'remote', url: 'http://localhost:3030' },
            { type: 'extension', target: 'extension-id' },
        ]) {
            expect(
                ConfigSchema.safeParse({ ...defaultRunConfig, provider })
                    .success
            ).toBe(true)
        }
    })

    it('rejects the removed dedicated wrapper and registered provider types', () => {
        expect(
            ConfigSchema.safeParse({
                ...defaultRunConfig,
                wrapper: { type: 'dedicated' },
            }).success
        ).toBe(false)
        expect(
            ConfigSchema.safeParse({
                ...defaultRunConfig,
                provider: { type: 'registered', name: 'Registered' },
            }).success
        ).toBe(false)
    })

    it('redact preserves structure and redacts nested strings without mutating input', () => {
        const input = {
            session: { accessToken: 'test-token', userId: 'user' },
            headers: [{ Authorization: 'Bearer test', cookie: '' }],
            secret: 'test-secret',
            privateKey: 'test-key',
            count: 2,
            enabled: true,
            missing: null,
        }
        const result: typeof input = redact(input)
        expect(result).toStrictEqual({
            session: { accessToken: '*****', userId: 'user' },
            headers: [{ Authorization: '*****', cookie: '*****' }],
            secret: '*****',
            privateKey: '*****',
            count: 2,
            enabled: true,
            missing: null,
        })
        expect(input.session.accessToken).toBe('test-token')
        expect(input.headers[0].cookie).toBe('')
        expect(result.session).not.toBe(input.session)
        expect(result.headers).not.toBe(input.headers)
        for (const value of ['plain text', 42, false, null, undefined]) {
            expect(redact(value)).toBe(value)
        }
    })

    it('redact keeps the name, message and code of errors', () => {
        expect(
            redact(
                providerErrors.userRejectedRequest({
                    message: 'Rejected',
                    data: { secret: 'x' },
                })
            )
        ).toStrictEqual({
            name: 'Error',
            message: 'Rejected',
            code: 4001,
            data: { secret: '*****' },
        })
    })

    it('redact rejects non-string sensitive values without exposing them', () => {
        for (const value of [
            42,
            true,
            null,
            undefined,
            ['test-secret'],
            { value: 'test-secret' },
        ]) {
            expect(() => redact({ nested: [{ accessToken: value }] })).toThrow(
                expect.objectContaining({
                    name: 'TypeError',
                    message:
                        "Sensitive field 'accessToken' could not be redacted because it is not a string",
                })
            )
        }
    })

    function fakeWallet(
        connected = false,
        signMessage: (message: string) => string = signWithWallet,
        signedParty: string | null = fakeAccount.partyId,
        // `null` mimics an async wallet that resolves the request and only reports the rejection via events.
        rejection: unknown = { code: 4001, message: 'Rejected' },
        emitMessageSignature = true
    ) {
        let resolveRequest: (value: unknown) => void
        let rejectRequest: (error: unknown) => void
        const provider = createProvider((async ({
            method,
            params,
        }: {
            method: string
            params?: { message?: unknown; commands?: unknown }
        }) => {
            const connection = {
                isConnected: connected,
                isNetworkConnected: connected,
            }
            if (method === 'status')
                return {
                    provider: { id: 'fake', providerType: 'browser' },
                    connection,
                }
            if (method === 'isConnected') return connection
            if (method === 'disconnect') {
                connected = false
                return null
            }
            if (method === 'conformance_unknownMethod')
                throw { code: -32601, message: 'Method not found' }
            if (method === undefined)
                throw { code: -32600, message: 'Invalid request' }
            if (
                !connected &&
                [
                    'listAccounts',
                    'getPrimaryAccount',
                    'signMessage',
                    'prepareExecute',
                ].includes(method)
            )
                throw { code: 4100, message: 'Unauthorized' }
            if (method === 'listAccounts') return [fakeAccount]
            if (method === 'getPrimaryAccount') return fakeAccount
            if (method === 'getActiveNetwork')
                return { networkId: 'canton:test' }
            if (
                (method === 'signMessage' &&
                    typeof params?.message !== 'string') ||
                (method === 'prepareExecute' &&
                    !Array.isArray(params?.commands))
            )
                throw { code: -32602, message: 'Invalid parameters' }
            return new Promise<unknown>((resolve, reject) => {
                resolveRequest = resolve
                rejectRequest = reject
            })
        }) as Provider['request'])
        const wrapper = new WrappingTestProvider(
            provider,
            async ({ method, decision, params }) => {
                if (decision === 'reject') {
                    if (method === 'signMessage' && emitMessageSignature)
                        provider.emit('messageSignature', {
                            messageId: 'message',
                            status: 'failed',
                        })
                    if (method === 'prepareExecute')
                        provider.emit('txChanged', {
                            commandId: (params as { commandId: string })
                                .commandId,
                            status: 'failed',
                        })
                    if (rejection === null) resolveRequest(null)
                    else rejectRequest(rejection)
                    return
                }
                if (method === 'connect') {
                    connected = true
                    resolveRequest({
                        isConnected: true,
                        isNetworkConnected: true,
                    })
                }
                if (method === 'signMessage') {
                    const signature = signMessage(
                        (params as { message: string }).message
                    )
                    if (emitMessageSignature)
                        provider.emit('messageSignature', {
                            messageId: 'message',
                            status: 'signed',
                            signature,
                        })
                    resolveRequest({ signature })
                }
                if (method === 'prepareExecute') {
                    const { commandId } = params as { commandId: string }
                    if (signedParty !== null)
                        provider.emit('txChanged', {
                            commandId,
                            status: 'signed',
                            payload: {
                                signature: 'tx-signature',
                                signedBy: fakeAccount.namespace,
                                party: signedParty,
                            },
                        })
                    provider.emit('txChanged', {
                        commandId,
                        status: 'executed',
                        payload: { updateId: 'update', completionOffset: 1 },
                    })
                    resolveRequest(null)
                }
            }
        )
        return { wrapper }
    }

    it.each([
        [4100, 'passed'],
        [-32602, 'failed'],
        [undefined, 'failed'],
    ] as const)(
        'checks disconnected prepareExecute authorization with response code %s',
        async (code, expectedStatus) => {
            const { wrapper } = fakeWallet()
            const request = wrapper.request.bind(wrapper)
            const prepareExecute = vi.fn(async () => {
                if (code !== undefined) throw { code, message: 'Rejected' }
                return null
            })
            vi.spyOn(wrapper, 'request').mockImplementation((args) =>
                args.method === 'prepareExecute'
                    ? prepareExecute()
                    : request(args)
            )
            const report = await runSuite({
                config: {
                    ...defaultConfig,
                    disabledTests: cases
                        .filter(
                            (testCase) => testCase.id !== 'connect.unauthorized'
                        )
                        .map((testCase) => testCase.id),
                },
                provider: wrapper,
            })
            expect(prepareExecute).toHaveBeenCalledOnce()
            expect(
                report.results.tests.find(
                    (result) => result.testId === 'connect.unauthorized'
                )?.status
            ).toBe(expectedStatus)
        }
    )

    it.each([
        ['expected errors', -32602, -32601, 5],
        ['unsupported method', -32602, 4200, 5],
        // CIP-103's EIP-1474 range expresses the same causes.
        ['server error range', -32000, -32004, 5],
        ['wrong codes', 4001, -32603, 0],
        ['string codes', '-32602', '-32601', 0],
        ['successful responses', undefined, undefined, 0],
    ] as const)(
        'connected error cases: %s',
        async (_, invalidParams, unknownMethod, passed) => {
            const action = vi.fn(async () => {
                throw new Error('Unexpected user interaction')
            })
            const request = vi.fn(async ({ method }: { method: string }) => {
                if (method === 'status')
                    return {
                        provider: { id: 'fake', providerType: 'browser' },
                        connection: {
                            isConnected: true,
                            isNetworkConnected: true,
                        },
                    }
                const code =
                    method === 'conformance_unknownMethod'
                        ? unknownMethod
                        : invalidParams
                if (code !== undefined) throw { code, message: 'Wallet error' }
                return null
            })
            const report = await runSuite({
                config: {
                    ...defaultConfig,
                    disabledTests: nonErrorHandlingTestIds,
                },
                provider: new WrappingTestProvider(
                    createProvider(request as Provider['request']),
                    action
                ),
            })
            expect(report.results.summary).toMatchObject({
                passed,
                failed: 5 - passed,
                skipped: TEST_CASE_COUNT - 5,
            })
            expect(action).not.toHaveBeenCalled()
        }
    )

    it.each([
        ['emits', true],
        ['does not emit', false],
    ])(
        'message signing passes when the wallet %s messageSignature events',
        async (_, emitMessageSignature) => {
            const { wrapper } = fakeWallet(
                true,
                signWithWallet,
                fakeAccount.partyId,
                undefined,
                emitMessageSignature
            )
            const testIds = ['signMessage.reject', 'signMessage.approve']
            const report = await runSuite({
                config: {
                    ...defaultConfig,
                    timeoutMs: 1000,
                    disabledTests: cases
                        .map((testCase) => testCase.id)
                        .filter((id) => !testIds.includes(id)),
                },
                provider: wrapper,
            })
            expect(report.results.summary).toMatchObject({
                passed: 2,
                failed: 0,
            })
        }
    )

    it.each([
        ['signed by a different key', signWithWallet('another message')],
        ['not a signature at all', 'signed-by-fake-wallet'],
    ])('a message signature %s fails', async (_, signature) => {
        const { wrapper } = fakeWallet(true, () => signature)
        const report = await runSuite({
            config: {
                ...defaultConfig,
                disabledTests: cases
                    .map((testCase) => testCase.id)
                    .filter((id) => id !== 'signMessage.approve'),
            },
            provider: wrapper,
        })
        expect(report.results.summary).toMatchObject({ passed: 0, failed: 1 })
        expect(
            report.results.tests.find(
                (test) => test.testId === 'signMessage.approve'
            )?.message
        ).toMatch(/does not verify against the account public key/)
    })

    it.each([
        [
            'rejected with code 4001',
            { code: 4001, message: 'Rejected' },
            'passed',
        ],
        [
            'rejected with code -32003',
            { code: -32003, message: 'Rejected' },
            'passed',
        ],
        [
            'rejected with code -32603',
            { code: -32603, message: 'Rejected' },
            'failed',
        ],
        ['resolved by an async wallet', null, 'passed'],
    ] as const)(
        'a transaction %s is %s',
        async (_, rejection, expectedStatus) => {
            const { wrapper } = fakeWallet(
                true,
                signWithWallet,
                null,
                rejection
            )
            const report = await runSuite({
                config: {
                    ...defaultConfig,
                    disabledTests: cases
                        .map((testCase) => testCase.id)
                        .filter((id) => id !== 'prepareExecute.reject'),
                },
                provider: wrapper,
            })
            expect(
                report.results.tests.find(
                    (test) => test.testId === 'prepareExecute.reject'
                )?.status
            ).toBe(expectedStatus)
        }
    )

    it.each([
        ['no signed event', null, /No signed txChanged event/],
        ['a foreign party', 'other-party', /names party other-party/],
    ])('an approved transaction with %s fails', async (_, party, message) => {
        const { wrapper } = fakeWallet(true, signWithWallet, party)
        const report = await runSuite({
            config: {
                ...defaultConfig,
                disabledTests: cases
                    .map((testCase) => testCase.id)
                    .filter((id) => id !== 'prepareExecute.approve'),
            },
            provider: wrapper,
        })
        expect(report.results.summary).toMatchObject({ passed: 0, failed: 1 })
        expect(
            report.results.tests.find(
                (test) => test.testId === 'prepareExecute.approve'
            )?.message
        ).toMatch(message)
    })

    it.each([
        { isConnected: false, isNetworkConnected: true },
        { isConnected: true, isNetworkConnected: false },
    ])(
        'error cases require a wallet and network connection: %j',
        async (connection) => {
            const request = vi.fn(async () => ({
                provider: { id: 'fake', providerType: 'browser' },
                connection,
            }))
            const report = await runSuite({
                config: {
                    ...defaultConfig,
                    disabledTests: nonErrorHandlingTestIds,
                },
                provider: new WrappingTestProvider(
                    createProvider(request as Provider['request']),
                    async () => {}
                ),
            })
            expect(report.results.summary).toMatchObject({
                passed: 0,
                failed: 5,
                skipped: TEST_CASE_COUNT - 5,
            })
        }
    )

    it('representative cases produce a valid CTRF report and clean listeners', async () => {
        const { wrapper } = fakeWallet()
        const on = vi.spyOn(wrapper, 'on')
        const removeListener = vi.spyOn(wrapper, 'removeListener')
        const approve = vi.spyOn(wrapper, 'test_approveConnect')
        const report = await runSuite({
            config: defaultConfig,
            provider: wrapper,
        })
        validateStrict(report)
        expect(report.results.tool).toStrictEqual({
            name: packageJson.name,
            version: packageJson.version,
        })
        expect(report.results.summary.passed).toBe(TEST_CASE_COUNT)
        expect(runPassed(report)).toBe(true)
        for (const result of report.results.tests) {
            const testCase = cases.find((item) => item.id === result.testId)
            expect(result.tags).toStrictEqual([testCase?.category])
        }
        // Names the wallet that answered, not just the tester's own label.
        expect(report.extra?.provider).toStrictEqual({
            type: defaultConfig.provider.type,
            wallet: { id: 'fake', providerType: 'browser' },
        })
        expect(removeListener.mock.calls).toStrictEqual(on.mock.calls)
        expect(wrapper.emit('txChanged', {})).toBe(false)
        // Running the `disconnect` case last keeps the suite at a single approval.
        expect(approve).toHaveBeenCalledOnce()
    })

    it('resets connect tests when already connected', async () => {
        const { wrapper } = fakeWallet(true)
        const approve = vi.spyOn(wrapper, 'test_approveConnect')
        const report = await runSuite({
            config: defaultConfig,
            provider: wrapper,
        })

        expect(report.results.summary.failed).toBe(0)
        expect(approve).toHaveBeenCalledOnce()
    })

    it('disabling every test skips the whole run, and all-skipped runs cannot pass', async () => {
        const config = ConfigSchema.parse({
            ...defaultConfig,
            disabledTests: cases.map((testCase) => testCase.id),
        })
        const report = await runSuite({
            config,
            provider: fakeWallet().wrapper,
        })
        expect(report.results.summary.skipped).toBe(TEST_CASE_COUNT)
        expect(runPassed(report)).toBe(false)
    })

    it('successful selected tests pass with skipped cases and retain correlated redacted logs', async () => {
        const report = await runSuite({
            config: {
                ...defaultConfig,
                disabledTests: nonErrorHandlingTestIds.filter(
                    (testId) => testId !== 'status'
                ),
            },
            provider: fakeWallet(true).wrapper,
        })
        expect(runPassed(report)).toBe(true)
        expect(report.results.summary).toMatchObject({
            passed: 6,
            skipped: TEST_CASE_COUNT - 6,
        })
        const diagnostics = report.extra?.diagnostics as {
            observations: {
                testId: string
                timestamp: number
                method: string
            }[]
        }
        const statusObservations = diagnostics.observations.filter(
            (entry) => entry.testId === 'status'
        )
        expect(statusObservations).toHaveLength(2)
        statusObservations.forEach((entry) => {
            expect(entry).toMatchObject({
                testId: 'status',
                method: 'status',
            })
            expect(entry.timestamp).toBeGreaterThan(0)
        })
    })

    it('timeout fails the active test and skips the rest when reconnecting fails', async () => {
        let requests = 0
        const provider = createProvider((() => {
            requests++
            return new Promise(() => {})
        }) as Provider['request'])
        const report = await runSuite({
            config: { ...defaultConfig, timeoutMs: 10 },
            provider: new WrappingTestProvider(provider, async () => {}),
            reconnect: async () => {
                throw new Error('Reconnect failed')
            },
        })
        expect(report.results.tests[0]).toMatchObject({
            status: 'failed',
            message: `${cases[0].id} timed out after 10ms`,
        })
        expect(report.results.summary.failed).toBe(1)
        expect(report.results.summary.skipped).toBe(TEST_CASE_COUNT - 1)
        expect(requests).toBe(1)
    })

    it('recovers from a halted run by reconnecting instead of skipping everything', async () => {
        const report = await runSuite({
            config: { ...defaultConfig, timeoutMs: 10 },
            provider: new WrappingTestProvider(
                createProvider(
                    (() => new Promise(() => {})) as Provider['request']
                ),
                async () => {}
            ),
            reconnect: async () => fakeWallet().wrapper,
        })
        expect(report.results.summary.failed).toBe(1)
        expect(report.results.summary.passed).toBe(TEST_CASE_COUNT - 1)
        expect(report.results.summary.skipped).toBe(0)
    })

    it('a non-wallet interaction error halts the run', async () => {
        vi.spyOn(cases[0], 'run').mockImplementation(async (runtime) => {
            await runtime.runInteraction('approve', { method: 'connect' })
        })
        const report = await runSuite({
            config: defaultConfig,
            provider: new WrappingTestProvider(
                createProvider(
                    (() => new Promise(() => {})) as Provider['request']
                ),
                async () => {
                    throw new Error('Action cancelled by tester')
                }
            ),
        })
        expect(report.results.tests[0]).toMatchObject({
            status: 'failed',
            message: 'Action cancelled by tester',
        })
        expect(report.results.summary.skipped).toBe(TEST_CASE_COUNT - 1)
    })

    it('hashes the serialized report, excluding diagnostics, independently of run id', async () => {
        const report = await runSuite({
            config: defaultConfig,
            provider: fakeWallet().wrapper,
        })
        const expected = createHash('sha256')
            .update(serializeReport(report))
            .digest('hex')
        expect(await reportHash(report)).toBe(expected)
        // Diagnostics are debug-only and never covered by the hash, regardless of content.
        expect(
            await reportHash({
                ...report,
                extra: {
                    ...report.extra,
                    diagnostics: { observations: [] },
                },
            })
        ).toBe(expected)
        // The run id is a nonce baked into the whole-report hash: a different
        // run id changes the hash even though the results are unchanged, so a
        // report can't be replayed under a claim of being a different/fresh run.
        expect(
            await reportHash({ ...report, reportId: 'different-run' })
        ).not.toBe(expected)
    })

    it('wallet signing receives only the result hash and records its signature', async () => {
        const report = await runSuite({
            config: defaultConfig,
            provider: fakeWallet().wrapper,
        })
        const signMessage = vi.fn(async () => ({
            signature: 'wallet-signature',
        }))
        const account = {
            primary: true,
            partyId: 'alice::fingerprint',
            networkId: 'testnet',
            status: 'allocated' as const,
            hint: 'alice',
            publicKey: walletPublicKey,
            namespace: 'fingerprint',
            signingProviderId: 'signer',
        }
        const listAccounts = vi.fn(async () => [
            { ...account, primary: false, partyId: 'other::fingerprint' },
            account,
        ])
        const sdk = { signMessage, listAccounts } as unknown as DappSDK
        const signature = await signReportWithWallet(report, sdk)
        const hash = await reportHash(report)
        expect(signMessage).toHaveBeenCalledExactlyOnceWith({ message: hash })
        expect(SignatureSchema.parse(signature)).toMatchObject({
            algorithm: 'Ed25519',
            partyId: account.partyId,
            networkId: account.networkId,
            value: 'wallet-signature',
            sha256: hash,
        })
        expect(signature).not.toHaveProperty('providerId')
        expect(signature).toHaveProperty('publicKey', account.publicKey)
        // Signing never mutates the report; the signature is detached.
        expect(report.extra?.signature).toBeUndefined()
        const rejection = new Error('Signing rejected')
        signMessage.mockRejectedValue(rejection)
        await expect(signReportWithWallet(report, sdk)).rejects.toBe(rejection)
        signMessage.mockClear()
        listAccounts.mockResolvedValue([])
        await expect(signReportWithWallet(report, sdk)).rejects.toThrow(
            /exactly one primary/
        )
        listAccounts.mockResolvedValue([account, account])
        await expect(signReportWithWallet(report, sdk)).rejects.toThrow(
            /exactly one primary/
        )
        expect(signMessage).not.toHaveBeenCalled()
    })

    it('key-file signature verifies with plain sha256/Ed25519 and detects a tampered file', async () => {
        const report = await runSuite({
            config: defaultConfig,
            provider: fakeWallet().wrapper,
        })
        const { privateKey, publicKey } = generateKeyPairSync('ed25519')
        const signature = SignatureSchema.parse(
            await signReport(
                report,
                privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
            )
        )
        // The exact bytes shipped as the report file, and what `sha256sum` on
        // that file would print — no canonicalization or our own hashing.
        const text = serializeReport(report)
        validateStrict(JSON.parse(text))
        expect(createHash('sha256').update(text).digest('hex')).toBe(
            signature.sha256
        )
        const value = Buffer.from(signature.value, 'base64')
        expect(
            verify(null, Buffer.from(signature.sha256), publicKey, value)
        ).toBe(true)
        const tampered = JSON.parse(text)
        tampered.results.tests[0].status = 'failed'
        const tamperedHash = createHash('sha256')
            .update(`${JSON.stringify(tampered, null, 2)}\n`)
            .digest('hex')
        expect(verify(null, Buffer.from(tamperedHash), publicKey, value)).toBe(
            false
        )
    })
})
