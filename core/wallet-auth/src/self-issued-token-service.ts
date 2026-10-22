// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { base64url, calculateJwkThumbprint, decodeJwt, type JWK } from 'jose'

export type SelfIssuedTokenClaimsInputs = {
    audience: string
    scope: string
    partyId: string
    username: string
    synchronizerId: string
    ttlSeconds: number
}

export class SelfIssuedTokenService {
    // RFC 7638 JWK thumbprint from a public key
    static publicKeyToEd25519Jwk(publicKeyBase64: string): JWK {
        return {
            kty: 'OKP',
            crv: 'Ed25519',
            x: base64url.encode(
                SelfIssuedTokenService.publicKeyBytes(publicKeyBase64)
            ),
        }
    }

    // returns header.payload part of JWT as string
    static async prepareForSigning(
        publicKeyBase64: string,
        claims: SelfIssuedTokenClaimsInputs
    ): Promise<string> {
        const now = Math.floor(Date.now() / 1000)
        const kid = await calculateJwkThumbprint(
            SelfIssuedTokenService.publicKeyToEd25519Jwk(publicKeyBase64),
            'sha256'
        )
        const header = SelfIssuedTokenService.encodeJson({
            alg: 'EdDSA',
            typ: 'JWT',
            kid,
        })
        const payload = SelfIssuedTokenService.encodeJson({
            aud: claims.audience,
            scope: claims.scope,
            exp: now + claims.ttlSeconds,
            iss: claims.partyId,
            sub: claims.partyId,
            'daml.com': {
                syn: claims.synchronizerId,
                usr: claims.username,
            },
        })
        return `${header}.${payload}`
    }

    // Tells whether the token prepared by prepareForSigning has expired. A token without expiry counts as expired
    static isSigningInputExpired(signingInput: string): boolean {
        try {
            // decodeJwt expects three segments, the signature segment is not read
            const exp = decodeJwt(`${signingInput}.`).exp
            return typeof exp !== 'number' || exp * 1000 <= Date.now()
        } catch {
            return true
        }
    }

    // returns full JWT string
    static appendJwtSignature(
        signingInput: string,
        base64Signature: string
    ): string {
        const signatureBytes = Uint8Array.from(atob(base64Signature), (char) =>
            char.charCodeAt(0)
        )
        return `${signingInput}.${base64url.encode(signatureBytes)}`
    }

    private static publicKeyBytes(publicKeyBase64: string): Uint8Array {
        return Uint8Array.from(atob(publicKeyBase64), (char) =>
            char.charCodeAt(0)
        )
    }

    private static encodeJson(value: unknown): string {
        return base64url.encode(new TextEncoder().encode(JSON.stringify(value)))
    }
}
