// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
    base64url,
    calculateJwkThumbprint,
    decodeProtectedHeader,
    decodeJwt,
} from 'jose'
import { SelfIssuedTokenService } from './self-issued-token-service.js'

function bytesToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }
    return btoa(binary)
}

const publicKey = bytesToBase64(new Uint8Array(32).fill(7))

describe('self-issued token service', () => {
    it('builds an EdDSA signing input and appends a base64 signature', async () => {
        const now = Math.floor(Date.now() / 1000)
        const signingInput = await SelfIssuedTokenService.prepareForSigning(
            publicKey,
            {
                audience: 'participant-aud',
                scope: 'daml_ledger_api',
                partyId: 'alice::ns',
                username: 'alice',
                synchronizerId: 'global-domain::fingerprint',
                ttlSeconds: 60,
            }
        )

        const header = decodeProtectedHeader(`${signingInput}.sig`)
        expect(header).toMatchObject({ alg: 'EdDSA', typ: 'JWT' })
        expect(header.kid).toBe(
            await calculateJwkThumbprint(
                SelfIssuedTokenService.publicKeyToEd25519Jwk(publicKey)
            )
        )

        const payload = decodeJwt(`${signingInput}.sig`)
        expect(payload).toMatchObject({
            aud: 'participant-aud',
            scope: 'daml_ledger_api',
            iss: 'alice::ns',
            sub: 'alice::ns',
            'daml.com': {
                syn: 'global-domain::fingerprint',
                usr: 'alice',
            },
        })
        expect(payload.exp).toBe(now + 60)

        const token = SelfIssuedTokenService.appendJwtSignature(
            signingInput,
            btoa('sig-bytes')
        )
        expect(token.startsWith(`${signingInput}.`)).toBe(true)
        expect(token.split('.')).toHaveLength(3)
    })

    describe('isSigningInputExpired', () => {
        const encode = (value: unknown) =>
            base64url.encode(new TextEncoder().encode(JSON.stringify(value)))
        const signingInputWith = (payload: object) =>
            `${encode({ alg: 'EdDSA', typ: 'JWT' })}.${encode(payload)}`
        const nowSeconds = () => Math.floor(Date.now() / 1000)

        it('is false for a token that has not expired yet', async () => {
            const signingInput = await SelfIssuedTokenService.prepareForSigning(
                publicKey,
                {
                    audience: 'participant-aud',
                    scope: 'daml_ledger_api',
                    partyId: 'alice::ns',
                    username: 'alice',
                    synchronizerId: 'global-domain::fingerprint',
                    ttlSeconds: 60,
                }
            )

            expect(
                SelfIssuedTokenService.isSigningInputExpired(signingInput)
            ).toBe(false)
        })

        it('is true for a token past its expiry', () => {
            expect(
                SelfIssuedTokenService.isSigningInputExpired(
                    signingInputWith({ exp: nowSeconds() - 1 })
                )
            ).toBe(true)
        })

        it('is true for a token without an expiry', () => {
            expect(
                SelfIssuedTokenService.isSigningInputExpired(
                    signingInputWith({ sub: 'alice::ns' })
                )
            ).toBe(true)
        })
    })
})
