// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
    deriveVaultKey,
    newHeader,
    openDocument,
    parseEnvelope,
    sealDocument,
    type VaultEnvelopeV1,
} from './envelope'
import { InvalidPasswordError } from './errors'

const ITERATIONS = 1000
const PASSWORD = 'correct horse 1'
const doc = { items: { greeting: 'hello', nested: { list: [1, 2, 3] } } }

async function seal(): Promise<{ key: CryptoKey; envelope: VaultEnvelopeV1 }> {
    const header = newHeader(ITERATIONS)
    const key = await deriveVaultKey(PASSWORD, header)
    const sealed = await sealDocument(key, header, doc)
    // As stored and read back by extension storage.
    const envelope = parseEnvelope(
        JSON.parse(JSON.stringify(sealed)),
        ITERATIONS
    )
    return { key, envelope }
}

describe('vault envelope', () => {
    it('decrypts what it encrypted', async () => {
        const { envelope } = await seal()

        const key = await deriveVaultKey(PASSWORD, envelope)

        expect(await openDocument(key, envelope)).toEqual(doc)
    })

    it('rejects a wrong password', async () => {
        const { envelope } = await seal()

        const key = await deriveVaultKey('wrong password 1', envelope)

        await expect(openDocument(key, envelope)).rejects.toThrow(
            InvalidPasswordError
        )
    })

    it('binds the header to the ciphertext', async () => {
        const { key, envelope } = await seal()
        const tampered = {
            ...envelope,
            kdf: { ...envelope.kdf, iterations: ITERATIONS + 1 },
        }

        // The right key fails too, because the header is part of the tag.
        await expect(openDocument(key, tampered)).rejects.toThrow(
            InvalidPasswordError
        )
    })
})
