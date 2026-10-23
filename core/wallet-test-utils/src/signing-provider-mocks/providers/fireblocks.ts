// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto'
import type { SigningProviderMockRoute } from '../server.js'
import { createMockTxStore } from '../tx-store.js'
import {
    createMockEd25519KeyPairFromSeed,
    type MockEd25519KeyPair,
    signMultiHashHex,
} from '../crypto.js'

type AdminSigningStatus = 'pending' | 'signed' | 'rejected' | 'failed'

type FireblocksTransactionStatus =
    | 'SUBMITTED'
    | 'COMPLETED'
    | 'REJECTED'
    | 'FAILED'

const ADMIN_STATUS_TO_FIREBLOCKS: Record<
    AdminSigningStatus,
    FireblocksTransactionStatus
> = {
    pending: 'SUBMITTED',
    signed: 'COMPLETED',
    rejected: 'REJECTED',
    failed: 'FAILED',
}

const CC_COIN_TYPE = 6767
const MOCK_VAULT_ID = '4'

export const MOCK_FIREBLOCKS_VAULT_NAME = 'Mock Vault'

const MOCK_VAULT_KEY_SEED = createHash('sha256')
    .update('mock-fireblocks-vault')
    .digest()

interface MockVaultKey extends MockEd25519KeyPair {
    derivationPath: number[]
}

interface MockFireblocksTransaction {
    id: string
    createdAt: number
    messageHex: string
    derivationPath: number[]
    publicKeyHex: string
    signatureHex?: string
    status: FireblocksTransactionStatus
    externalTxId?: string
}

interface CreateTransactionBody {
    externalTxId?: string
    extraParameters: {
        rawMessageData: {
            messages: Array<{ content: string; derivationPath: number[] }>
            algorithm?: string
        }
    }
}

interface SetTransactionStateBody {
    txId?: string
    status?: AdminSigningStatus
}

function createMockVaultKey(): MockVaultKey {
    const key = createMockEd25519KeyPairFromSeed(MOCK_VAULT_KEY_SEED)
    return {
        ...key,
        derivationPath: [44, CC_COIN_TYPE, Number(MOCK_VAULT_ID), 0, 0],
    }
}

function formatTransactionResponse(
    tx: MockFireblocksTransaction
): Record<string, unknown> {
    const response: Record<string, unknown> = {
        id: tx.id,
        status: tx.status,
        createdAt: tx.createdAt,
        extraParameters: {
            rawMessageData: {
                messages: [
                    {
                        content: tx.messageHex,
                        derivationPath: tx.derivationPath,
                    },
                ],
                algorithm: 'MPC_EDDSA_ED25519',
            },
        },
    }

    if (tx.status === 'COMPLETED') {
        if (!tx.signatureHex) {
            throw new Error(
                `Missing signature for completed transaction ${tx.id}`
            )
        }
        response.signedMessages = [
            {
                publicKey: tx.publicKeyHex,
                content: tx.messageHex,
                signature: { fullSig: tx.signatureHex },
                derivationPath: tx.derivationPath,
            },
        ]
    }

    return response
}

export function createFireblocksMockProvider(): SigningProviderMockRoute[] {
    const vaultKey = createMockVaultKey()
    const derivationPathKey = JSON.stringify(vaultKey.derivationPath)
    const keysByDerivationPath = new Map<string, MockVaultKey>([
        [derivationPathKey, vaultKey],
    ])
    const keysByPublicKeyHex = new Map<string, MockVaultKey>([
        [vaultKey.publicKeyHex, vaultKey],
    ])
    const txStore = createMockTxStore<MockFireblocksTransaction>((tx) => tx.id)

    const routes: SigningProviderMockRoute[] = [
        {
            method: 'GET',
            path: '/v1/vault/accounts_paged',
            handler: ({ query }) => {
                const after = query.get('after')
                if (after) {
                    return {
                        body: {
                            accounts: [],
                            paging: {},
                        },
                    }
                }

                return {
                    body: {
                        accounts: [
                            {
                                id: MOCK_VAULT_ID,
                                name: MOCK_FIREBLOCKS_VAULT_NAME,
                            },
                        ],
                        paging: {},
                    },
                }
            },
        },
        {
            method: 'GET',
            path: '/v1/vault/public_key_info',
            handler: ({ query }) => {
                const derivationPathParam = query.get('derivationPath')
                if (!derivationPathParam) {
                    return {
                        status: 400,
                        body: { error: 'missing_derivation_path' },
                    }
                }

                const key = keysByDerivationPath.get(derivationPathParam)
                if (!key) {
                    return {
                        status: 404,
                        body: { error: 'key_not_found' },
                    }
                }

                return {
                    body: {
                        publicKey: key.publicKeyHex,
                    },
                }
            },
        },
        {
            method: 'POST',
            path: '/v1/transactions',
            handler: ({ body }) => {
                const parsed = body as CreateTransactionBody
                const message =
                    parsed.extraParameters?.rawMessageData?.messages?.[0]
                if (!message?.content || !message.derivationPath) {
                    return {
                        status: 400,
                        body: { error: 'missing_raw_message' },
                    }
                }

                const derivationPathString = JSON.stringify(
                    message.derivationPath
                )
                const key = keysByDerivationPath.get(derivationPathString)
                if (!key) {
                    return {
                        status: 400,
                        body: { error: 'unknown_derivation_path' },
                    }
                }

                const tx = txStore.save({
                    id: txStore.nextId('mock-fb-tx'),
                    createdAt: Date.now(),
                    messageHex: message.content,
                    derivationPath: message.derivationPath,
                    publicKeyHex: key.publicKeyHex,
                    status: 'SUBMITTED',
                    ...(parsed.externalTxId !== undefined && {
                        externalTxId: parsed.externalTxId,
                    }),
                })

                return {
                    body: {
                        id: tx.id,
                        status: tx.status,
                    },
                }
            },
        },
        {
            method: 'GET',
            path: '/v1/transactions',
            handler: () => ({
                body: txStore.list().map(formatTransactionResponse),
            }),
        },
        {
            method: 'GET',
            path: '/v1/transactions/:txId',
            handler: ({ pathParams }) => {
                const tx = txStore.get(pathParams.txId)
                if (!tx) {
                    return {
                        status: 404,
                        body: { error: 'transaction_not_found' },
                    }
                }

                return {
                    body: formatTransactionResponse(tx),
                }
            },
        },
        {
            method: 'POST',
            path: '/_admin/setTransactionState',
            handler: ({ body }) => {
                const { txId, status } = body as SetTransactionStateBody
                if (!txId) {
                    return {
                        status: 400,
                        body: { error: 'missing_tx_id' },
                    }
                }

                const existing = txStore.get(txId)
                if (!existing) {
                    return {
                        status: 404,
                        body: { error: 'transaction_not_found', txId },
                    }
                }

                const adminStatus = status ?? 'pending'
                const key = keysByPublicKeyHex.get(existing.publicKeyHex)
                if (adminStatus === 'signed' && !key) {
                    return {
                        status: 500,
                        body: { error: 'signing_key_not_found' },
                    }
                }

                const nextTx = txStore.save({
                    ...existing,
                    status: ADMIN_STATUS_TO_FIREBLOCKS[adminStatus],
                    ...(adminStatus === 'signed' && key
                        ? {
                              signatureHex: signMultiHashHex(
                                  existing.messageHex,
                                  key
                              ),
                          }
                        : {}),
                })

                return {
                    body: formatTransactionResponse(nextTx),
                }
            },
        },
    ]

    return routes
}
