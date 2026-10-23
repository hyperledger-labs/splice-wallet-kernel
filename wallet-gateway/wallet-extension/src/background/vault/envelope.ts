// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    decrypt,
    deriveKey,
    encrypt,
    fromB64,
    randomBytes,
    toB64,
} from './crypto'
import { CorruptVaultError, InvalidPasswordError } from './errors'

/** What `local:vault` holds. Binary fields are base64. */
export interface VaultEnvelopeV1 {
    version: 1
    /** A random UUID. */
    vaultId: string
    kdf: {
        name: 'PBKDF2'
        hash: 'SHA-256'
        iterations: number
        /** 32 bytes. */
        salt: string
    }
    /** 12 bytes. */
    iv: string
    /** AES-GCM ciphertext of `JSON(VaultDocV1)`, ending with the 16-byte tag. */
    data: string
}

/** The readable part of the envelope, bound to the ciphertext as AAD. */
export type VaultHeaderV1 = Omit<VaultEnvelopeV1, 'iv' | 'data'>

/** The decrypted document. */
export interface VaultDocV1 {
    items: Record<string, unknown>
}

/** Iterations for new keys, and the lowest count a stored vault may have (OWASP). */
export const KDF_ITERATIONS = 600_000
export const MAX_KDF_ITERATIONS = 10_000_000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** A header with a new salt. */
export function newHeader(
    iterations: number,
    vaultId: string = crypto.randomUUID()
): VaultHeaderV1 {
    return {
        version: 1,
        vaultId,
        kdf: {
            name: 'PBKDF2',
            hash: 'SHA-256',
            iterations,
            salt: toB64(randomBytes(32)),
        },
    }
}

/** Derives the key for a header's salt and iterations. */
export function deriveVaultKey(
    password: string,
    { kdf }: VaultHeaderV1
): Promise<CryptoKey> {
    return deriveKey(password, fromB64(kdf.salt), kdf.iterations)
}

/**
 * Checks a stored envelope's shape and limits, so a tampered header can't
 * make the KDF run with weak or huge settings. Throws `CorruptVaultError`.
 */
export function parseEnvelope(
    value: unknown,
    minIterations = KDF_ITERATIONS
): VaultEnvelopeV1 {
    if (!isRecord(value) || !isRecord(value.kdf)) {
        throw new CorruptVaultError('The vault has the wrong shape.')
    }
    const { version, vaultId, kdf, iv, data } = value
    const { name, hash, iterations, salt } = kdf
    if (version !== 1 || name !== 'PBKDF2' || hash !== 'SHA-256') {
        throw new CorruptVaultError(
            'The vault has an unknown version or algorithm.'
        )
    }
    if (
        typeof iterations !== 'number' ||
        !Number.isInteger(iterations) ||
        iterations < minIterations ||
        iterations > MAX_KDF_ITERATIONS
    ) {
        throw new CorruptVaultError(
            'The vault has an out-of-range iteration count.'
        )
    }
    if (typeof vaultId !== 'string' || !UUID.test(vaultId)) {
        throw new CorruptVaultError('The vault has an invalid ID.')
    }
    if (
        typeof salt !== 'string' ||
        typeof iv !== 'string' ||
        typeof data !== 'string' ||
        byteLength(salt) !== 32 ||
        byteLength(iv) !== 12 ||
        byteLength(data) < 16
    ) {
        throw new CorruptVaultError(
            'The vault has an invalid salt, IV or ciphertext.'
        )
    }
    return {
        version,
        vaultId,
        kdf: { name, hash, iterations, salt },
        iv,
        data,
    }
}

/** Encrypts the document with a fresh IV, bound to the header. */
export async function sealDocument(
    key: CryptoKey,
    header: VaultHeaderV1,
    doc: VaultDocV1
): Promise<VaultEnvelopeV1> {
    const { iv, data } = await encrypt(
        key,
        encoder.encode(JSON.stringify(doc)),
        headerAad(header)
    )
    return { ...header, iv: toB64(iv), data: toB64(data) }
}

/**
 * Decrypts a parsed envelope. Throws `InvalidPasswordError` when the tag
 * check fails, and `CorruptVaultError` when the document is malformed.
 */
export async function openDocument(
    key: CryptoKey,
    envelope: VaultEnvelopeV1
): Promise<VaultDocV1> {
    let plaintext: Uint8Array<ArrayBuffer>
    try {
        plaintext = await decrypt(
            key,
            fromB64(envelope.iv),
            fromB64(envelope.data),
            headerAad(envelope)
        )
    } catch (error) {
        if (error instanceof Error && error.name === 'OperationError') {
            throw new InvalidPasswordError({ cause: error })
        }
        throw error
    }
    let doc: unknown
    try {
        doc = JSON.parse(decoder.decode(plaintext))
    } catch (error) {
        throw new CorruptVaultError('The vault document is not JSON.', {
            cause: error,
        })
    }
    if (!isRecord(doc) || !isRecord(doc.items)) {
        throw new CorruptVaultError('The vault document has the wrong shape.')
    }
    return { items: doc.items }
}

export function headerOf({
    version,
    vaultId,
    kdf,
}: VaultEnvelopeV1): VaultHeaderV1 {
    return { version, vaultId, kdf }
}

/** The header fields as a JSON array, which keeps their byte order fixed. */
function headerAad({ version, vaultId, kdf }: VaultHeaderV1) {
    return encoder.encode(
        JSON.stringify([
            version,
            vaultId,
            kdf.name,
            kdf.hash,
            kdf.iterations,
            kdf.salt,
        ])
    )
}

function byteLength(b64: string): number {
    try {
        return fromB64(b64).length
    } catch {
        return -1
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}
