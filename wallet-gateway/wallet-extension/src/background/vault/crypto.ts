// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Web Crypto primitives for the vault. Chrome, Firefox and Node 24 all have
// `crypto.subtle`, so no crypto library is needed.

type Bytes = Uint8Array<ArrayBuffer>

const encoder = new TextEncoder()

const AES_GCM_TAG_BITS = 128

// The native `Uint8Array.toBase64` isn't in Node 24 or Firefox 128.
export function toB64(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }
    return btoa(binary)
}

/** Throws on invalid base64. */
export function fromB64(b64: string): Bytes {
    return Uint8Array.from(atob(b64), (char) => char.charCodeAt(0))
}

export function randomBytes(length: number): Bytes {
    return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Derives an AES-256-GCM key from a password with PBKDF2-HMAC-SHA-256. The
 * key is extractable only so that it can be cached in session storage.
 */
export async function deriveKey(
    password: string,
    salt: Bytes,
    iterations: number
): Promise<CryptoKey> {
    // NFC: the same password typed on another OS or keyboard gives the same bytes.
    const base = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password.normalize('NFC')),
        'PBKDF2',
        false,
        ['deriveKey']
    )
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        base,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    )
}

export async function exportKey(key: CryptoKey): Promise<Bytes> {
    return new Uint8Array(await crypto.subtle.exportKey('raw', key))
}

/** Imports raw key bytes as a non-extractable working key. */
export function importKey(raw: Bytes): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
        'encrypt',
        'decrypt',
    ])
}

/** Encrypts with a fresh 12-byte IV. `data` ends with the 16-byte tag. */
export async function encrypt(
    key: CryptoKey,
    plaintext: Bytes,
    aad: Bytes
): Promise<{ iv: Bytes; data: Bytes }> {
    const iv = randomBytes(12)
    const data = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
            additionalData: aad,
            tagLength: AES_GCM_TAG_BITS,
        },
        key,
        plaintext
    )
    return { iv, data: new Uint8Array(data) }
}

/**
 * Throws an `OperationError` when the key is wrong or any byte of the
 * ciphertext, IV or AAD changed. Web Crypto doesn't say which.
 */
export async function decrypt(
    key: CryptoKey,
    iv: Bytes,
    data: Bytes,
    aad: Bytes
): Promise<Bytes> {
    const plaintext = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv,
            additionalData: aad,
            tagLength: AES_GCM_TAG_BITS,
        },
        key,
        data
    )
    return new Uint8Array(plaintext)
}
