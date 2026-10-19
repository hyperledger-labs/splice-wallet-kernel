// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest'
import {
    PartyLevelRight,
    UserLevelRight,
    type MessageRaw,
    type Network,
    type Transaction,
    type Wallet,
} from '@canton-network/core-wallet-store'
import type { Idp } from '@canton-network/core-wallet-auth'
import {
    fromIdp,
    fromMessageRaw,
    fromNetwork,
    fromPartyRight,
    fromTransaction,
    fromUserRight,
    fromWallet,
    toIdp,
    toMessageRaw,
    toNetwork,
    toTransaction,
    toWallet,
    toWalletStatus,
    toWalletUpdateProperties,
} from './schema.js'

const oauthIdp: Idp = {
    id: 'idp-oauth',
    type: 'oauth',
    issuer: 'https://issuer.example',
    configUrl: 'https://issuer.example/.well-known/openid-configuration',
}

const selfSignedIdp: Idp = {
    id: 'idp-self',
    type: 'self_signed',
    issuer: 'unsafe-auth',
}

const selfIssuedIdp: Idp = {
    id: 'idp-self-issued',
    type: 'self_issued',
}

const baseNetwork: Network = {
    id: 'net-1',
    name: 'Testnet',
    description: 'desc',
    identityProviderId: 'idp-oauth',
    ledgerApi: { baseUrl: 'http://localhost:6865' },
    auth: {
        method: 'authorization_code',
        audience: 'aud',
        scope: 'scope',
        clientId: 'cid',
    },
    serviceAccountAuth: {
        method: 'client_credentials',
        audience: 'aud',
        scope: 'scope',
        clientId: 'cid',
        clientSecret: 'secret',
    },
    adminAuth: {
        method: 'client_credentials',
        audience: 'admin-aud',
        scope: 'admin-scope',
        clientId: 'admin-cid',
        clientSecret: 'admin-secret',
    },
}

describe('schema mappers', () => {
    describe('Idp', () => {
        test('round-trips oauth, self_signed, and self_issued IdPs', () => {
            expect(toIdp(fromIdp(oauthIdp))).toEqual(oauthIdp)
            expect(toIdp(fromIdp(selfSignedIdp))).toEqual(selfSignedIdp)
            expect(toIdp(fromIdp(selfIssuedIdp))).toEqual(selfIssuedIdp)
            expect(fromIdp(selfSignedIdp).configUrl).toBeNull()
            expect(fromIdp(selfIssuedIdp).configUrl).toBeNull()
        })

        test('throws when oauth IdP row is missing configUrl', () => {
            expect(() =>
                toIdp({
                    id: 'bad',
                    type: 'oauth',
                    issuer: 'https://issuer.example',
                    configUrl: null,
                })
            ).toThrow('Missing configUrl for oauth IdP: bad')
        })
    })

    describe('Network', () => {
        test('round-trips network with adminAuth', () => {
            const table = fromNetwork(baseNetwork, 'user-1')
            expect(table.userId).toBe('user-1')
            expect(table.synchronizerId).toBeNull()
            expect(toNetwork(table)).toEqual(baseNetwork)
        })

        test('omits adminAuth when not set on the domain model', () => {
            // oxlint-disable-next-line no-unused-vars
            const { adminAuth, ...withoutAdmin } = baseNetwork
            const table = fromNetwork(withoutAdmin)
            expect(table.adminAuth).toBeUndefined()
            expect(toNetwork(table).adminAuth).toBeUndefined()
        })
    })

    describe('Wallet', () => {
        test('maps wallet fields and update properties', () => {
            const wallet: Wallet = {
                primary: true,
                partyId: 'party::ns',
                status: 'allocated',
                hint: 'hint',
                publicKey: 'pk',
                namespace: 'ns',
                networkId: 'net-1',
                signingProviderId: 'internal',
                disabled: true,
                reason: 'disabled',
                externalTxId: 'ext-tx-id',
                topologyTransactions: 'topo',
                rights: [],
                userId: 'the-user',
            }

            const table = fromWallet(wallet, 'user-1')
            expect(table.primary).toBe(1)
            expect(table.disabled).toBe(1)
            expect(table.isAuthParty).toBe(0)
            expect(toWallet(table)).toMatchObject({
                primary: true,
                disabled: true,
                isAuthParty: false,
                reason: 'disabled',
                externalTxId: 'ext-tx-id',
                topologyTransactions: 'topo',
            })

            expect(
                toWalletUpdateProperties({
                    partyId: 'party::ns',
                    primary: false,
                    disabled: false,
                    isAuthParty: true,
                })
            ).toEqual({
                primary: 0,
                disabled: 0,
                isAuthParty: 1,
            })
        })

        test('maps wallet status strings', () => {
            expect(toWalletStatus('allocated')).toBe('allocated')
            expect(toWalletStatus('removed')).toBe('removed')
            expect(toWalletStatus(null)).toBe('initialized')
        })
    })

    describe('rights helpers', () => {
        test('parses known rights and rejects unknown values', () => {
            expect(fromPartyRight(PartyLevelRight.CanActAs)).toBe(
                PartyLevelRight.CanActAs
            )
            expect(fromPartyRight('not-a-right')).toBeUndefined()
            expect(fromUserRight(UserLevelRight.CanReadAsAnyParty)).toBe(
                UserLevelRight.CanReadAsAnyParty
            )
            expect(fromUserRight('invalid')).toBeUndefined()
        })
    })

    describe('Transaction', () => {
        test('round-trips transaction timestamps and externalTxId', () => {
            const createdAt = new Date('2026-01-01T00:00:00.000Z')
            const signedAt = new Date('2026-01-01T00:01:00.000Z')
            const transaction: Transaction = {
                id: 'tx-1',
                commandId: 'cmd-1',
                status: 'signed',
                preparedTransaction: 'prepared',
                preparedTransactionHash: 'hash',
                payload: {},
                origin: 'https://dapp.example',
                createdAt,
                signedAt,
                externalTxId: 'ext-1',
                failureReason: 'ledger timeout',
                networkId: 'net-1',
                userId: 'user-1',
            }

            const table = fromTransaction(transaction, 'user-1', 'net-1')
            expect(toTransaction(table)).toEqual(transaction)
        })
    })

    describe('MessageRaw', () => {
        test('round-trips message with signature', () => {
            const message: MessageRaw = {
                id: 'msg-1',
                status: 'signed',
                userId: 'user-1',
                partyId: 'party::ns',
                publicKey: 'pk',
                message: 'sign me',
                origin: 'https://dapp.example',
                createdAt: new Date('2026-02-01T12:00:00.000Z'),
                signedAt: new Date('2026-02-01T12:01:00.000Z'),
                signature: 'sig',
            }

            const table = fromMessageRaw(message, 'user-1', 'net-1')
            expect(toMessageRaw(table)).toEqual(message)
        })

        test('round-trips externalTxId and failureReason', () => {
            const message: MessageRaw = {
                id: 'msg-1',
                status: 'failed',
                userId: 'user-1',
                partyId: 'party::ns',
                publicKey: 'pk',
                message: 'sign me',
                origin: null,
                createdAt: new Date('2026-02-01T12:00:00.000Z'),
                externalTxId: 'provider-req-1',
                failureReason: 'Signing provider returned status: rejected',
            }

            const table = fromMessageRaw(message, 'user-1', 'net-1')
            expect(table.externalTxId).toBe('provider-req-1')
            expect(table.failureReason).toBe(
                'Signing provider returned status: rejected'
            )
            expect(toMessageRaw(table)).toEqual(message)
        })

        test('maps missing externalTxId and failureReason to null and back to absent', () => {
            const message: MessageRaw = {
                id: 'msg-1',
                status: 'pending',
                userId: 'user-1',
                partyId: 'party::ns',
                publicKey: 'pk',
                message: 'sign me',
                origin: null,
                createdAt: new Date('2026-02-01T12:00:00.000Z'),
            }

            const table = fromMessageRaw(message, 'user-1', 'net-1')
            expect(table.externalTxId).toBeNull()
            expect(table.failureReason).toBeNull()
            const roundTripped = toMessageRaw(table)
            expect(roundTripped).not.toHaveProperty('externalTxId')
            expect(roundTripped).not.toHaveProperty('failureReason')
        })

        test('throws when message userId does not match', () => {
            const message: MessageRaw = {
                id: 'msg-1',
                status: 'pending',
                userId: 'other-user',
                partyId: 'party::ns',
                publicKey: 'pk',
                message: 'sign me',
                origin: null,
                createdAt: new Date(),
            }

            expect(() => fromMessageRaw(message, 'user-1', 'net-1')).toThrow(
                'MessageRaw userId mismatch'
            )
        })
    })
})
