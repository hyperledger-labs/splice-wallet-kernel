// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { storage } from 'wxt/utils/storage'
import { logger } from '@/shared/logger'
import { passwordProblems } from '@/shared/password-policy'
import { vaultStatusItem } from '@/shared/storage'
import type { VaultStatus } from '@/shared/vault-protocol'
import { exportKey, fromB64, importKey, toB64 } from './crypto'
import {
    deriveVaultKey,
    headerOf,
    KDF_ITERATIONS,
    newHeader,
    openDocument,
    parseEnvelope,
    sealDocument,
    type VaultDocV1,
    type VaultEnvelopeV1,
    type VaultHeaderV1,
} from './envelope'
import {
    VaultExistsError,
    VaultLockedError,
    VaultNotFoundError,
    WeakPasswordError,
} from './errors'

export interface Vault {
    /** Settles when the restore after a background start has finished. Never rejects. */
    readonly ready: Promise<void>
    /** Reliable once `ready` has settled. */
    status(): VaultStatus
    /** Throws `VaultExistsError`, or `WeakPasswordError` when the password breaks the policy. */
    create(password: string): Promise<void>
    /** Throws `InvalidPasswordError`, `CorruptVaultError` or `VaultNotFoundError`. */
    unlock(password: string): Promise<void>
    lock(): Promise<void>
    /** Needs an unlocked vault. Checks `next` against the policy. */
    changePassword(current: string, next: string): Promise<void>
    /** Deletes the vault. Its data is gone. */
    reset(): Promise<void>
    /**
     * An encrypted item. Values must be JSON-serializable; they are stored,
     * and returned, as they look after `JSON.stringify` and `JSON.parse`.
     */
    defineItem<T>(key: string, opts: { fallback: T }): VaultItem<T>
}

export interface VaultItem<T> {
    /** Throws `VaultLockedError` when the vault isn't unlocked, as do the others. */
    getValue(): Promise<T>
    setValue(value: T): Promise<void>
    /** Read-modify-write inside the vault queue. Resolves to `fn`'s result. */
    update(fn: (value: T) => T): Promise<T>
    removeValue(): Promise<void>
}

/** The cached key, so the vault stays unlocked across background restarts. */
interface VaultSession {
    vaultId: string
    /** Raw AES key, base64. */
    key: string
}

// The only vault data on disk. Validated on every read.
const vaultItem = storage.defineItem<VaultEnvelopeV1>('local:vault')
// Background-only. Session storage is memory-only, cleared on browser restart
// and extension update, and hidden from content scripts.
const vaultSessionItem = storage.defineItem<VaultSession>(
    'session:vaultSession'
)

const log = logger.getChild('vault')

/** What the vault holds in memory while unlocked. */
interface OpenVault {
    key: CryptoKey
    header: VaultHeaderV1
    doc: VaultDocV1
}

/**
 * Creates the vault and starts restoring it from session storage right away.
 *
 * Every operation runs in one queue, after `ready`. `lock()` bumps the
 * generation before its first `await`; an operation called before that
 * keeps no result in memory and doesn't cache a key.
 *
 * `iterations` is the PBKDF2 count for new keys. Stored vaults must have at
 * least 600,000, or `iterations` when tests set it lower.
 */
export function createVault(opts: { iterations?: number } = {}): Vault {
    const iterations = opts.iterations ?? KDF_ITERATIONS
    const minIterations = Math.min(iterations, KDF_ITERATIONS)

    let status: VaultStatus = 'locked'
    let open: OpenVault | undefined
    let generation = 0
    let publishedStatus: VaultStatus | undefined

    const ready = restore(generation)
        .catch((error: unknown) => {
            log.warn('Could not restore the unlocked vault: {error}', {
                error,
            })
        })
        .then(publishStatus)
    let queue: Promise<unknown> = ready

    function enqueue<T>(op: () => Promise<T>): Promise<T> {
        const result = queue.then(op)
        queue = result.catch(() => undefined)
        return result
    }

    /**
     * Runs an operation in the queue, then publishes the status. With
     * `rejectIfLocked`, a `lock()` that came in at any await, the status write
     * included, turns the operation's success into `VaultLockedError`.
     */
    function run<T>(
        op: (gen: number) => Promise<T>,
        { rejectIfLocked = false } = {}
    ): Promise<T> {
        const gen = generation
        return enqueue(async () => {
            const result = await op(gen).finally(publishStatus)
            // Nothing awaits after this check, so no lock() can come in after it.
            if (rejectIfLocked) assertCurrent(gen)
            return result
        })
    }

    function assertCurrent(gen: number): void {
        if (gen !== generation) {
            throw new VaultLockedError(
                'The vault was locked during the operation.'
            )
        }
    }

    function unlocked(gen: number): OpenVault {
        assertCurrent(gen)
        if (open === undefined) throw new VaultLockedError()
        return open
    }

    /** Keeps `session:vaultStatus` in sync for the pages. Never throws. */
    async function publishStatus(): Promise<void> {
        const next = status
        if (next === publishedStatus) return
        try {
            await vaultStatusItem.setValue(next)
            publishedStatus = next
        } catch (error) {
            log.warn('Could not save the vault status: {error}', { error })
        }
    }

    async function readEnvelope(): Promise<VaultEnvelopeV1> {
        const stored = await vaultItem.getValue()
        if (stored === null) throw new VaultNotFoundError()
        return parseEnvelope(stored, minIterations)
    }

    async function restore(gen: number): Promise<void> {
        const stored = await vaultItem.getValue()
        status = stored === null ? 'uninitialized' : 'locked'
        const session = await vaultSessionItem.getValue()
        if (session === null) return
        try {
            // A lock whose key removal failed still published 'locked', so
            // the leftover key must not reopen the vault.
            if ((await vaultStatusItem.getValue()) !== 'unlocked') {
                throw new Error(
                    'The vault was locked; ignoring its cached key.'
                )
            }
            if (stored === null) throw new VaultNotFoundError()
            const envelope = parseEnvelope(stored, minIterations)
            if (envelope.vaultId !== session.vaultId) {
                throw new Error('The cached key is for another vault.')
            }
            // No PBKDF2 here, so this takes milliseconds.
            const key = await importKey(fromB64(session.key))
            const doc = await openDocument(key, envelope)
            if (gen === generation) {
                open = { key, header: headerOf(envelope), doc }
                status = 'unlocked'
                log.info('Vault restored')
            }
        } catch (error) {
            await vaultSessionItem.removeValue()
            throw error
        }
    }

    /**
     * Unlocks memory with the key and caches the key in the session, unless
     * `lock()` came in meanwhile. Returns whether it unlocked.
     */
    async function openSession(
        gen: number,
        extractableKey: CryptoKey,
        header: VaultHeaderV1,
        doc: VaultDocV1
    ): Promise<boolean> {
        const raw = await exportKey(extractableKey)
        // Memory keeps a non-extractable copy only.
        const key = await importKey(raw)
        if (gen !== generation) return false
        open = { key, header, doc }
        status = 'unlocked'
        // A lock() from here on removes the session after this write, since
        // its cleanup runs next in the queue.
        try {
            await vaultSessionItem.setValue({
                vaultId: header.vaultId,
                key: toB64(raw),
            })
        } catch (error) {
            log.warn(
                'Could not cache the vault key; a background restart will lock the vault: {error}',
                { error }
            )
        }
        return true
    }

    /** Encrypts and writes `doc`, then commits it to memory. */
    async function save(
        gen: number,
        change: (items: Record<string, unknown>) => Record<string, unknown>
    ): Promise<void> {
        const current = unlocked(gen)
        // The round trip makes memory match what a restore would read.
        const next = JSON.parse(
            JSON.stringify({ items: change({ ...current.doc.items }) })
        ) as VaultDocV1
        const envelope = await sealDocument(current.key, current.header, next)
        assertCurrent(gen)
        await vaultItem.setValue(envelope)
        // After a lock() the write still stands; memory is already cleared.
        if (gen === generation) current.doc = next
    }

    return {
        ready,

        status: () => status,

        create: (password) =>
            run(async (gen) => {
                const problems = passwordProblems(password)
                if (problems.length > 0) throw new WeakPasswordError(problems)
                if ((await vaultItem.getValue()) !== null) {
                    throw new VaultExistsError()
                }
                const header = newHeader(iterations)
                const key = await deriveVaultKey(password, header)
                const doc: VaultDocV1 = { items: {} }
                const envelope = await sealDocument(key, header, doc)
                assertCurrent(gen)
                await vaultItem.setValue(envelope)
                // The vault exists now, even if a lock() keeps it locked.
                status = 'locked'
                await openSession(gen, key, header, doc)
                log.info('Vault created')
            }),

        unlock: (password) =>
            run(
                async (gen) => {
                    const envelope = await readEnvelope()
                    const key = await deriveVaultKey(password, envelope)
                    const doc = await openDocument(key, envelope)
                    if (await openSession(gen, key, headerOf(envelope), doc)) {
                        log.info('Vault unlocked')
                    }
                },
                // An unlock that a lock() interrupts must not report success.
                { rejectIfLocked: true }
            ),

        lock: () => {
            // Before any await: in-flight operations see the new generation.
            generation++
            open = undefined
            if (status === 'unlocked') status = 'locked'
            return enqueue(async () => {
                try {
                    await vaultSessionItem.removeValue()
                    log.info('Vault locked')
                } finally {
                    await publishStatus()
                }
            })
        },

        changePassword: (currentPassword, nextPassword) =>
            run(async (gen) => {
                const problems = passwordProblems(nextPassword)
                if (problems.length > 0) throw new WeakPasswordError(problems)
                const { header, doc } = unlocked(gen)
                // Decrypting with the current password proves it.
                const stored = await readEnvelope()
                await openDocument(
                    await deriveVaultKey(currentPassword, stored),
                    stored
                )
                const nextHeader = newHeader(iterations, header.vaultId)
                const key = await deriveVaultKey(nextPassword, nextHeader)
                const envelope = await sealDocument(key, nextHeader, doc)
                assertCurrent(gen)
                await vaultItem.setValue(envelope)
                await openSession(gen, key, nextHeader, doc)
                log.info('Vault password changed')
            }),

        reset: () =>
            run(async () => {
                open = undefined
                if (status === 'unlocked') status = 'locked'
                await vaultSessionItem.removeValue()
                await vaultItem.removeValue()
                status = 'uninitialized'
                log.info('Vault reset')
            }),

        defineItem<T>(
            key: string,
            { fallback }: { fallback: T }
        ): VaultItem<T> {
            const read = (items: Record<string, unknown>): T =>
                // A copy, so callers can't change memory without a write.
                structuredClone(
                    Object.hasOwn(items, key) ? (items[key] as T) : fallback
                )
            return {
                getValue: () =>
                    run(async (gen) => read(unlocked(gen).doc.items)),
                setValue: (value) =>
                    run((gen) =>
                        save(gen, (items) => ({ ...items, [key]: value }))
                    ),
                update: (fn) =>
                    run(async (gen) => {
                        const value = fn(read(unlocked(gen).doc.items))
                        await save(gen, (items) => ({ ...items, [key]: value }))
                        return value
                    }),
                removeValue: () =>
                    run((gen) =>
                        save(gen, (items) => {
                            delete items[key]
                            return items
                        })
                    ),
            }
        },
    }
}
