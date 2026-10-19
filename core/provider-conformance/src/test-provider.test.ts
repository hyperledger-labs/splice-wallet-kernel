// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProvider } from './create-provider.js'
import type { Provider } from './test-provider.js'
import {
    WebhookWrapper,
    WindowEventWrapper,
    WrappingTestProvider,
    performInteraction,
    testMethodNames,
    type TestMethods,
} from './test-provider.js'

// Macrotask boundary: all pending microtasks drain before this resolves.
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve))

describe('Test provider wrappers', () => {
    afterEach(() => vi.restoreAllMocks())

    it('test hooks only perform actions and never dispatch wallet requests', async () => {
        const request = vi.fn(async () => null)
        const provider = createProvider(request)
        const handleInteraction = vi.fn(async () => {})
        const wrapper = new WrappingTestProvider(provider, handleInteraction)
        const message = { message: 'test' }
        const transaction = { commands: [] }
        expect(await wrapper.test_approveConnect()).toBeUndefined()
        expect(await wrapper.test_rejectConnect()).toBeUndefined()
        expect(await wrapper.test_approveSignMessage(message)).toBeUndefined()
        expect(await wrapper.test_rejectSignMessage(message)).toBeUndefined()
        expect(
            await wrapper.test_approvePrepareExecute(transaction)
        ).toBeUndefined()
        expect(
            await wrapper.test_rejectPrepareExecute(transaction)
        ).toBeUndefined()
        expect(request).not.toHaveBeenCalled()
        expect(handleInteraction.mock.calls).toHaveLength(6)
    })

    it('exposes only the six supported interaction hooks', () => {
        expect(testMethodNames).toStrictEqual([
            'test_approveConnect',
            'test_rejectConnect',
            'test_approveSignMessage',
            'test_rejectSignMessage',
            'test_approvePrepareExecute',
            'test_rejectPrepareExecute',
        ])
        const provider = createProvider(
            (async () => null) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(provider, async () => {})
        expect(
            Object.keys(wrapper).filter((key) => key.startsWith('test_'))
        ).toStrictEqual(testMethodNames)
    })

    it.each(['approve', 'reject'] as const)(
        'orchestrates dedicated hooks after dispatch (%s)',
        async (decision) => {
            const calls: string[] = []
            const expected = { signature: 'dedicated-signature' }
            const rejection = { code: 4001, message: 'Wallet rejected' }
            const provider = createProvider(async ({ method }) => {
                calls.push(method)
                if (decision === 'reject') throw rejection
                return expected
            })
            const unused = vi.fn(async () => {
                throw new Error('Unexpected hook')
            })
            const action = vi.fn(async (params: { message: string }) => {
                expect(params.message).toBe('test')
                calls.push(decision)
                await nextTask()
                calls.push('action completed')
            })
            const hooks: TestMethods = {
                test_approveConnect: unused,
                test_rejectConnect: unused,
                test_approveSignMessage: action,
                test_rejectSignMessage: action,
                test_approvePrepareExecute: unused,
                test_rejectPrepareExecute: unused,
            }
            const pending = performInteraction(
                { ...provider, ...hooks },
                decision,
                new AbortController().signal,
                {
                    method: 'signMessage',
                    params: { message: 'test' },
                }
            )
            if (decision === 'reject')
                await expect(pending).rejects.toBe(rejection)
            else expect(await pending).toBe(expected)
            expect(calls).toStrictEqual([
                'signMessage',
                decision,
                'action completed',
            ])
            expect(action).toHaveBeenCalledTimes(1)
            expect(unused).not.toHaveBeenCalled()
        }
    )

    it('does not expose hook failures as wallet rejection codes', async () => {
        const rejection = { code: 4001, message: 'Hook failed' }
        const provider = createProvider(
            (() => new Promise(() => {})) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(provider, async () => {
            throw rejection
        })
        const pending = performInteraction(
            wrapper,
            'reject',
            new AbortController().signal,
            { method: 'connect' }
        )
        await expect(pending).rejects.toMatchObject({
            message: 'Wallet action failed',
            cause: rejection,
        })
        await expect(pending).rejects.not.toHaveProperty('code')
    })

    it('preserves native settlement timeout errors', async () => {
        const nativeTimeout = AbortSignal.timeout.bind(AbortSignal)
        vi.spyOn(AbortSignal, 'timeout').mockImplementation(() =>
            nativeTimeout(1)
        )
        const provider = createProvider(
            (() => new Promise(() => {})) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(provider, async () => {})
        await Promise.all([
            expect(
                performInteraction(
                    wrapper,
                    'approve',
                    new AbortController().signal,
                    { method: 'connect' }
                )
            ).rejects.toMatchObject({ name: 'TimeoutError' }),
            new Promise<void>((resolve) => setTimeout(resolve, 20)),
        ])
    })

    it('wrapper preserves SDK result inference and event delegation', async () => {
        const expected = { signature: 'wallet-signature' }
        const provider = createProvider(
            (async () => expected) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(provider, async () => {})
        const result = await wrapper.request({
            method: 'signMessage',
            params: { message: 'test' },
        })
        const signature: string = result.signature
        expect(signature).toBe(expected.signature)
        const events: (typeof expected)[] = []
        const listener = (event: typeof expected) => {
            events.push(event)
        }
        expect(wrapper.on('messageSignature', listener)).toBe(provider)
        expect(wrapper.emit('messageSignature', expected)).toBe(true)
        expect(events).toStrictEqual([expected])
        expect(wrapper.removeListener('messageSignature', listener)).toBe(
            provider
        )
        expect(wrapper.emit('messageSignature', expected)).toBe(false)
    })

    it('dispatches before approval and forwards identical params and real result', async () => {
        const calls: string[] = []
        const params = { message: 'conformance' }
        const expected = { signature: 'real-wallet-result' }
        let complete!: (value: unknown) => void
        const provider = createProvider(((args) => {
            calls.push('request')
            expect(args).toHaveProperty('params', params)
            expect('params' in args && args.params).toBe(params)
            return new Promise<unknown>((resolve) => {
                complete = resolve
            })
        }) as Provider['request'])
        const wrapper = new WrappingTestProvider(
            provider,
            async (interaction) => {
                calls.push(interaction.decision)
                expect(interaction.params).toBe(params)
                complete(expected)
            }
        )
        const result = await performInteraction(
            wrapper,
            'approve',
            new AbortController().signal,
            { method: 'signMessage', params }
        )
        const signature: string = result.signature
        expect(signature).toBe(expected.signature)
        expect(result).toBe(expected)
        expect(calls).toStrictEqual(['request', 'approve'])
    })

    it('preserves a real wallet rejection rather than synthesizing it', async () => {
        const rejection = { code: 4001, message: 'Rejected by user' }
        const provider = createProvider((async () => {
            throw rejection
        }) as Provider['request'])
        const wrapper = new WrappingTestProvider(provider, async () => {})
        await expect(
            performInteraction(
                wrapper,
                'reject',
                new AbortController().signal,
                { method: 'connect' }
            )
        ).rejects.toBe(rejection)
    })

    it('prepareExecute waits for the wallet result after transaction approval', async () => {
        const params = {
            commandId: 'command',
            commands: [
                { CreateCommand: { templateId: 'test', createArguments: {} } },
            ],
        }
        const expected = null
        const calls: string[] = []
        let complete!: (result: unknown) => void
        let approved!: () => void
        const approval = new Promise<void>((resolve) => {
            approved = resolve
        })
        const provider = createProvider(((args) => {
            calls.push(args.method)
            expect(args).toHaveProperty('params', params)
            expect('params' in args && args.params).toBe(params)
            return new Promise<unknown>((resolve) => {
                complete = resolve
            })
        }) as Provider['request'])
        const wrapper = new WrappingTestProvider(
            provider,
            async (interaction) => {
                expect(interaction.method).toBe('prepareExecute')
                expect(interaction.params).toBe(params)
                calls.push(interaction.decision)
                approved()
            }
        )
        let settled = false
        const pending = performInteraction(
            wrapper,
            'approve',
            new AbortController().signal,
            { method: 'prepareExecute', params }
        ).then((result) => {
            settled = true
            return result
        })
        await approval
        expect(settled).toBe(false)
        expect(calls).toStrictEqual(['prepareExecute', 'approve'])
        complete(expected)
        expect(await pending).toBe(expected)
    })

    it('prepareExecute preserves the wallet error after transaction rejection', async () => {
        const params = {
            commands: [
                { CreateCommand: { templateId: 'test', createArguments: {} } },
            ],
        }
        const rejection = { code: 4001, message: 'Rejected by wallet' }
        let rejectRequest!: (error: unknown) => void
        const calls: string[] = []
        const provider = createProvider(((args) => {
            calls.push(args.method)
            expect(args).toHaveProperty('params', params)
            expect('params' in args && args.params).toBe(params)
            return new Promise((_resolve, reject) => {
                rejectRequest = reject
            })
        }) as Provider['request'])
        const wrapper = new WrappingTestProvider(
            provider,
            async (interaction) => {
                expect(interaction.method).toBe('prepareExecute')
                expect(interaction.params).toBe(params)
                calls.push(interaction.decision)
                rejectRequest(rejection)
            }
        )
        await expect(
            performInteraction(
                wrapper,
                'reject',
                new AbortController().signal,
                { method: 'prepareExecute', params }
            )
        ).rejects.toBe(rejection)
        expect(calls).toStrictEqual(['prepareExecute', 'reject'])
    })

    it('request settlement deadline starts only after the action completes', async () => {
        const deadline = new AbortController()
        const timeout = vi
            .spyOn(AbortSignal, 'timeout')
            .mockReturnValue(deadline.signal)
        let finishAction!: () => void
        const action = new Promise<void>((resolve) => {
            finishAction = resolve
        })
        const provider = createProvider(
            (() => new Promise(() => {})) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(provider, () => action)
        let settled = false
        const pending = performInteraction(
            wrapper,
            'approve',
            new AbortController().signal,
            { method: 'connect' }
        )
        void pending.then(
            () => {
                settled = true
            },
            () => {
                settled = true
            }
        )
        const reason = new Error('Request settlement timed out')
        const rejected = expect(pending).rejects.toBe(reason)
        await nextTask()
        expect(timeout).not.toHaveBeenCalled()
        expect(settled).toBe(false)
        finishAction()
        await nextTask()
        expect(timeout).toHaveBeenCalledExactlyOnceWith(5000)
        expect(settled).toBe(false)
        deadline.abort(reason)
        await rejected
    })

    it('wallet completion before the deadline preserves its result', async () => {
        const deadline = new AbortController()
        vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
        const expected = { isConnected: true, isNetworkConnected: true }
        let complete!: (value: unknown) => void
        const provider = createProvider(
            (() =>
                new Promise<unknown>((resolve) => {
                    complete = resolve
                })) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(provider, async () => {})
        const pending = performInteraction(
            wrapper,
            'approve',
            new AbortController().signal,
            { method: 'connect' }
        )
        await nextTask()
        complete(expected)
        expect(await pending).toBe(expected)
        deadline.abort(new Error('Request settlement timed out'))
        expect(await pending).toBe(expected)
    })

    it('cancellation during the action does not start a settlement timer later', async () => {
        const schedule = vi.spyOn(AbortSignal, 'timeout')
        const controller = new AbortController()
        const provider = createProvider(
            (() => new Promise(() => {})) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(
            provider,
            async (_interaction, signal) => {
                signal.throwIfAborted()
                await new Promise<void>((_resolve, reject) => {
                    signal.addEventListener(
                        'abort',
                        () => reject(signal.reason),
                        { once: true }
                    )
                })
            },
            controller.signal
        )
        const pending = performInteraction(
            wrapper,
            'approve',
            controller.signal,
            { method: 'connect' }
        )
        const reason = new Error('Cancelled')
        controller.abort(reason)
        await expect(pending).rejects.toBe(reason)
        await nextTask()
        expect(schedule).not.toHaveBeenCalled()
    })

    it.each([false, true])(
        'window wrapper ignores unrelated acks and correlates the real one (failure: %s)',
        async (failure) => {
            const target = new EventTarget()
            const removeListener = vi.spyOn(target, 'removeEventListener')
            const provider = createProvider(
                (async () => 'connected') as Provider['request']
            )
            target.addEventListener('cip103:test:interaction', (event) => {
                const { id } = (event as CustomEvent<{ id: string }>).detail
                for (const detail of [
                    null,
                    [],
                    {},
                    'invalid',
                    { id: 123 },
                    { id: 'unrelated', completed: true },
                    { id: 'unrelated', error: 'Wrong interaction' },
                ]) {
                    target.dispatchEvent(
                        new CustomEvent('cip103:test:ack', { detail })
                    )
                }
                target.dispatchEvent(
                    new CustomEvent('cip103:test:ack', {
                        detail: failure
                            ? { id, error: 'Action failed' }
                            : { id, completed: true },
                    })
                )
            })
            const wrapper = new WindowEventWrapper(provider, target)
            const pending = wrapper.test_approveConnect()
            if (failure) await expect(pending).rejects.toThrow('Action failed')
            else expect(await pending).toBeUndefined()
            expect(removeListener).toHaveBeenCalledWith(
                'cip103:test:ack',
                expect.any(Function)
            )
        }
    )

    it.each([
        {},
        { completed: false },
        { error: 123 },
        { completed: true, error: 'Conflicting reply' },
    ])(
        'window wrapper rejects a malformed ack for the current interaction (%j)',
        async (extra) => {
            const target = new EventTarget()
            const provider = createProvider(
                (async () => 'connected') as Provider['request']
            )
            target.addEventListener('cip103:test:interaction', (event) => {
                const { id } = (event as CustomEvent<{ id: string }>).detail
                target.dispatchEvent(
                    new CustomEvent('cip103:test:ack', {
                        detail: { id, ...extra },
                    })
                )
            })
            const wrapper = new WindowEventWrapper(provider, target)
            await expect(wrapper.test_approveConnect()).rejects.toThrow(
                /malformed acknowledgement/
            )
        }
    )

    it('aborting a pending wallet request settles the shared utility', async () => {
        const controller = new AbortController()
        const provider = createProvider(
            (() => new Promise(() => {})) as Provider['request']
        )
        const wrapper = new WrappingTestProvider(
            provider,
            async () => {},
            controller.signal
        )
        const pending = performInteraction(
            wrapper,
            'approve',
            controller.signal,
            { method: 'connect' }
        )
        await nextTask()
        controller.abort(new Error('Run cancelled'))
        await expect(pending).rejects.toThrow(/Run cancelled/)
    })

    it('window wrapper removes acknowledgement listeners on abort', async () => {
        const target = new EventTarget()
        const removeListener = vi.spyOn(target, 'removeEventListener')
        const controller = new AbortController()
        const provider = createProvider(
            (async () => null) as Provider['request']
        )
        const wrapper = new WindowEventWrapper(
            provider,
            target,
            controller.signal
        )
        const pending = wrapper.test_approveConnect()
        controller.abort(new Error('Timed out'))
        await expect(pending).rejects.toThrow(/Timed out/)
        expect(removeListener).toHaveBeenCalledWith(
            'cip103:test:ack',
            expect.any(Function)
        )
    })

    it('webhook accepts completion or a string error for the correct id', async () => {
        const provider = createProvider(
            (async () => null) as Provider['request']
        )
        const fetch = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementation(async (_url, init) => {
                const interaction = JSON.parse(init?.body as string)
                return Response.json({ id: interaction.id, completed: true })
            })
        const wrapper = new WebhookWrapper(
            provider,
            'http://localhost:9999/approve'
        )
        expect(await wrapper.test_approveConnect()).toBeUndefined()
        fetch.mockImplementation(async (_url, init) => {
            const interaction = JSON.parse(init?.body as string)
            return Response.json({ id: interaction.id, error: 'Action failed' })
        })
        await expect(wrapper.test_approveConnect()).rejects.toThrow(
            'Action failed'
        )
        fetch.mockImplementation(async () =>
            Response.json({ id: 'wrong', completed: true })
        )
        await expect(wrapper.test_approveConnect()).rejects.toThrow(
            /acknowledge/
        )
        for (const completed of [undefined, false, 'true', 1, null]) {
            fetch.mockImplementation(async (_url, init) => {
                const interaction = JSON.parse(init?.body as string)
                return Response.json({ id: interaction.id, completed })
            })
            await expect(wrapper.test_approveConnect()).rejects.toThrow(
                /acknowledge/
            )
        }
        for (const acknowledgement of [null, [], {}, 'invalid']) {
            fetch.mockImplementation(async () => Response.json(acknowledgement))
            await expect(wrapper.test_approveConnect()).rejects.toThrow(
                /acknowledge/
            )
        }
        for (const fields of [
            { error: 123 },
            { error: null },
            { completed: true, error: 'Conflicting reply' },
        ]) {
            fetch.mockImplementation(async (_url, init) => {
                const interaction = JSON.parse(init?.body as string)
                return Response.json({ id: interaction.id, ...fields })
            })
            await expect(wrapper.test_approveConnect()).rejects.toThrow(
                /acknowledge/
            )
        }
    })
})
