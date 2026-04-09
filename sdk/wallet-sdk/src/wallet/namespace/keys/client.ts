// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    createKeyPair,
    KeyPair,
    PublicKey,
} from '@canton-network/core-signing-lib'

export class KeysClient {
    constructor() {}

    /**
     *
     * @returns A base64 encoded public/private key pair
     */
    generate(): KeyPair {
        return createKeyPair()
    }

    public async fingerprint(publicKey: PublicKey) {
        const hashPurpose = 12 // For `PublicKeyFingerprint`
        const keyBytes = Buffer.from(publicKey, 'base64')
        const hashInput = Buffer.alloc(4 + keyBytes.length)
        hashInput.writeUInt32BE(hashPurpose, 0)
        Buffer.from(keyBytes).copy(hashInput, 4)
        const hash = new Uint8Array(
            await crypto.subtle.digest('SHA-256', hashInput)
        )
        const multiprefix = Buffer.from([0x12, 0x20])
        return Buffer.concat([multiprefix, hash]).toString('hex')
    }
}
