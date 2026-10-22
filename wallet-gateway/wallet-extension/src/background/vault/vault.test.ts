// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { InvalidPasswordError, VaultLockedError } from './errors'
import { createVault, type Vault } from './vault'

const PASSWORD = 'first password 1'

async function startVault(): Promise<Vault> {
    const vault = createVault({ iterations: 1000 })
    await vault.ready
    return vault
}

async function createdVault(): Promise<Vault> {
    const vault = await startVault()
    await vault.create(PASSWORD)
    return vault
}

/** Makes the next call of `target[method]` wait until `release()`. */
function pauseCall<T extends object, K extends keyof T>(target: T, method: K) {
    const reached = Promise.withResolvers<void>()
    const released = Promise.withResolvers<void>()
    const original = (target[method] as (...args: unknown[]) => unknown).bind(
        target
    )
    vi.spyOn(target, method as never).mockImplementationOnce((async (
        ...args: unknown[]
    ) => {
        reached.resolve()
        await released.promise
        return original(...args)
    }) as never)
    return { reached: reached.promise, release: () => released.resolve() }
}

/** Makes the session-storage write of `key` wait until `release()`. */
function pauseSessionWrite(key: string) {
    const reached = Promise.withResolvers<void>()
    const released = Promise.withResolvers<void>()
    const session = fakeBrowser.storage.session
    const set = session.set.bind(session)
    vi.spyOn(session, 'set').mockImplementation(async (items) => {
        if (Object.hasOwn(items, key)) {
            reached.resolve()
            await released.promise
        }
        return set(items)
    })
    return { reached: reached.promise, release: () => released.resolve() }
}

describe('vault', () => {
    beforeEach(() => {
        fakeBrowser.reset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('keeps items encrypted while locked and returns them after unlock', async () => {
        const vault = await createdVault()
        const secret = vault.defineItem('secret', { fallback: '' })
        await secret.setValue('s3cret')

        await vault.lock()

        expect(vault.status()).toBe('locked')
        await expect(secret.getValue()).rejects.toThrow(VaultLockedError)

        await vault.unlock(PASSWORD)

        expect(vault.status()).toBe('unlocked')
        expect(await secret.getValue()).toBe('s3cret')
    })

    it('stays unlocked across a background restart until the session is cleared', async () => {
        const vault = await createdVault()
        await vault.defineItem('secret', { fallback: '' }).setValue('s3cret')

        const restarted = await startVault()

        expect(restarted.status()).toBe('unlocked')
        expect(
            await restarted.defineItem('secret', { fallback: '' }).getValue()
        ).toBe('s3cret')

        // A browser restart clears session storage.
        await fakeBrowser.storage.session.clear()
        const afterBrowserRestart = await startVault()

        expect(afterBrowserRestart.status()).toBe('locked')
    })

    it('stays locked after a restart when lock() could not remove the cached key', async () => {
        const vault = await createdVault()
        vi.spyOn(fakeBrowser.storage.session, 'remove').mockRejectedValueOnce(
            new Error('storage failure')
        )

        await expect(vault.lock()).rejects.toThrow('storage failure')

        expect((await startVault()).status()).toBe('locked')
    })

    it('persists concurrent updates', async () => {
        const vault = await createdVault()
        const counter = vault.defineItem('counter', { fallback: 0 })

        await Promise.all([
            counter.update((n) => n + 1),
            counter.update((n) => n + 1),
        ])

        const restarted = await startVault()
        expect(
            await restarted.defineItem('counter', { fallback: 0 }).getValue()
        ).toBe(2)
    })

    // Each await in unlock() is a window for a lock() from another page.
    it.each([
        ['derives the key', () => pauseCall(crypto.subtle, 'deriveKey')],
        ['caches the key', () => pauseSessionWrite('vaultSession')],
        ['publishes the status', () => pauseSessionWrite('vaultStatus')],
    ])(
        'stays locked when lock() comes in while unlock() %s',
        async (_, pause) => {
            const vault = await createdVault()
            await vault.lock()

            const paused = pause()
            const unlocking = vault.unlock(PASSWORD)
            await paused.reached
            const locking = vault.lock()
            paused.release()

            await expect(unlocking).rejects.toThrow(VaultLockedError)
            await locking
            expect(vault.status()).toBe('locked')
            // No key stays cached, so a background restart stays locked too.
            expect((await startVault()).status()).toBe('locked')
        }
    )

    it('opens only with the new password after a password change', async () => {
        const vault = await createdVault()
        const secret = vault.defineItem('secret', { fallback: '' })
        await secret.setValue('s3cret')

        await vault.changePassword(PASSWORD, 'second password 2')
        await vault.lock()

        await expect(vault.unlock(PASSWORD)).rejects.toThrow(
            InvalidPasswordError
        )
        await vault.unlock('second password 2')
        expect(await secret.getValue()).toBe('s3cret')
    })
})
