// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient, PostResponse, Types } from './ledger-client.js'
import { createHash } from 'node:crypto'
import { PartyId } from '@canton-network/core-types'

type GenerateTransactionResponse =
    PostResponse<'/v2/parties/external/generate-topology'>

type AllocateExternalPartyResponse =
    PostResponse<'/v2/parties/external/allocate'>

type OnboardingTransactions = NonNullable<
    Types['AllocateExternalPartyRequest']['onboardingTransactions']
>

type MultiHashSignatures = NonNullable<
    Types['AllocateExternalPartyRequest']['multiHashSignatures']
>

function prefixedInt(value: number, bytes: Buffer | Uint8Array): Buffer {
    const buffer = Buffer.alloc(4 + bytes.length)
    buffer.writeUInt32BE(value, 0)
    Buffer.from(bytes).copy(buffer, 4)
    return buffer
}

function computeSha256CantonHash(purpose: number, bytes: Uint8Array): string {
    const hashInput = prefixedInt(purpose, bytes)

    const hash = createHash('sha256').update(hashInput).digest()
    const multiprefix = Buffer.from([0x12, 0x20])

    return Buffer.concat([multiprefix, hash]).toString('hex')
}

export class TopologyWriteService {
    private ledgerClient: LedgerClient

    constructor(
        private synchronizerId: string,
        ledgerClient: LedgerClient
    ) {
        this.ledgerClient = ledgerClient
    }

    static combineHashes(hashes: Buffer[]): string {
        // Sort the hashes by their hex representation
        const sortedHashes = hashes.sort((a, b) =>
            a.toString('hex').localeCompare(b.toString('hex'))
        )

        // Start with the number of hashes encoded as a 4-byte integer in big-endian
        const combinedHashes = Buffer.alloc(4)
        combinedHashes.writeUInt32BE(sortedHashes.length, 0)

        // Concatenate each hash, prefixing them with their size as a 4-byte integer in big-endian
        let concatenatedHashes = combinedHashes
        for (const h of sortedHashes) {
            const lengthBuffer = Buffer.alloc(4)
            lengthBuffer.writeUInt32BE(h.length, 0)
            concatenatedHashes = Buffer.concat([
                concatenatedHashes,
                lengthBuffer,
                h,
            ])
        }

        // 55 is the hash purpose for multi topology transaction hashes
        const predefineHashPurpose = computeSha256CantonHash(
            55,
            concatenatedHashes
        )

        //convert to base64
        return Buffer.from(predefineHashPurpose, 'hex').toString('base64')
    }

    static createFingerprintFromKey = (publicKey: string): string => {
        // Hash purpose codes can be looked up in the Canton codebase:
        //  https://github.com/DACH-NY/canton/blob/62e9ccd3f1743d2c9422d863cfc2ca800405c71b/community/base/src/main/scala/com/digitalasset/canton/crypto/HashPurpose.scala#L52
        const hashPurpose = 12 // For `PublicKeyFingerprint`

        // Implementation for creating a fingerprint from the public key
        return computeSha256CantonHash(
            hashPurpose,
            Buffer.from(publicKey, 'base64')
        )
    }

    async allocateExternalParty(
        onboardingTransactions: OnboardingTransactions,
        multiHashSignatures: MultiHashSignatures
    ): Promise<AllocateExternalPartyResponse> {
        return this.ledgerClient.post('/v2/parties/external/allocate', {
            synchronizer: this.synchronizerId,
            identityProviderId: '',
            onboardingTransactions,
            multiHashSignatures,
        })
    }

    async generateTransactions(
        publicKey: string,
        partyHint: PartyId = '',
        confirmingThreshold: number = 1
    ): Promise<GenerateTransactionResponse> {
        return this.ledgerClient.post(
            '/v2/parties/external/generate-topology',
            {
                synchronizer: this.synchronizerId,
                partyHint,
                publicKey: {
                    format: 'CRYPTO_KEY_FORMAT_RAW',
                    keyData: publicKey,
                    keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519',
                },
                localParticipantObservationOnly: false,
                confirmationThreshold: confirmingThreshold,
                otherConfirmingParticipantUids: [],
            }
        )
    }
}
