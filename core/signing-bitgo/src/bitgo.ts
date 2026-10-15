// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Key, SigningStatus } from '@canton-network/core-signing-lib'

// Topology payloads are base64(JSON array). Transaction payloads are raw proto binary.
function detectPayloadType(txBase64: string): string {
    try {
        if (
            Array.isArray(
                JSON.parse(Buffer.from(txBase64, 'base64').toString('utf8'))
            )
        )
            return 'CANTON_SIGN_TOPOLOGY'
    } catch {
        // not JSON — must be proto binary
    }
    return 'CANTON_SIGN_TRANSACTION'
}

// Wallet-allocation code sends topology payloads as base64(JSON.stringify([proto, ...])) — a JSON
// array, even for a single transaction. BitGo's Canton HSM path expects raw proto bytes directly,
// so unwrap the envelope here. Throws on multi-item batches; BitGo does not yet support them.
function unwrapTopologyPayload(txBase64: string): string {
    let decoded: unknown
    try {
        decoded = JSON.parse(Buffer.from(txBase64, 'base64').toString('utf8'))
    } catch {
        return txBase64
    }
    if (!Array.isArray(decoded)) return txBase64
    if (decoded.length !== 1)
        throw new Error(
            `BitGo signing driver only supports single-item topology transaction batches; received ${decoded.length}`
        )
    return decoded[0] as string
}

const BITGO_STATE_TO_CANTON: Record<string, SigningStatus> = {
    pendingApproval: 'pending',
    initialized: 'pending',
    pendingDelivery: 'pending',
    pendingUserSignature: 'pending',
    pendingUserCommitment: 'pending',
    pendingUserRShare: 'pending',
    pendingUserGShare: 'pending',
    readyToSend: 'pending',
    delivered: 'signed',
    signed: 'signed',
    canceled: 'rejected',
    rejected: 'rejected',
    failed: 'failed',
}

export interface BitGoConfig {
    accessToken: string
    baseUrl?: string
    enterpriseId?: string
    /** Canton coin name. Defaults to 'tcanton' for bitgo-test.com URLs, 'canton' otherwise. */
    coin?: string
}

interface BitGoWallet {
    id: string
    label: string
    keys: string[]
}

interface BitGoKeychain {
    commonKeychain: string
}

interface BitGoTxRequest {
    txRequestId: string
    walletId: string
    state: string
    // The signature lives in messages[0].txHash (hex-encoded JSON), not a top-level field.
    messages?: Array<{ state?: string; txHash?: string }>
}

export interface BitGoTransaction {
    txId: string
    status: SigningStatus
    // Ed25519 base64 public key derived from the wallet keychain at m/0.
    publicKey?: string
    signature?: string
    metadata?: Record<string, unknown>
}

export class BitGoHandler {
    private readonly baseUrl: string
    private readonly accessToken: string
    private readonly enterpriseId: string | undefined
    private readonly coin: string
    // txRequestId → walletId. Lost on restart; recovered via the enterprise endpoint.
    private readonly txStore = new Map<string, string>()
    // Bidirectional publicKey ↔ walletId cache. Swapped atomically in getKeys().
    private keyMap = new Map<string, string>()
    private walletKeyMap = new Map<string, string>()
    // Lazy-initialized WASM Ed25519 BIP32 tree.
    private hdTree?: ReturnType<BitGoHandler['initHdTree']>

    constructor(config: BitGoConfig) {
        this.baseUrl = (config.baseUrl ?? 'https://app.bitgo.com').replace(
            /\/$/,
            ''
        )
        this.accessToken = config.accessToken
        this.enterpriseId = config.enterpriseId
        this.coin =
            config.coin ??
            (this.baseUrl.includes('bitgo-test.com') ? 'tcanton' : 'canton')
    }

    private async request<T>(
        method: 'GET' | 'POST',
        path: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.accessToken}`,
        }
        if (this.enterpriseId) headers['Bitgo-Enterprise'] = this.enterpriseId
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            ...(body !== undefined && { body: JSON.stringify(body) }),
        })
        if (!response.ok) {
            throw new Error(
                `BitGo API ${method} ${path} failed (${response.status}): ${await response.text()}`
            )
        }
        return response.json() as Promise<T>
    }

    private txStoreSet(txId: string, walletId: string): void {
        this.txStore.set(txId, walletId)
        if (this.txStore.size > 10_000) {
            const oldest = this.txStore.keys().next().value as
                string | undefined
            if (oldest) this.txStore.delete(oldest)
        }
    }

    getWalletId(publicKey: string | undefined): string | undefined {
        return publicKey ? this.keyMap.get(publicKey) : undefined
    }

    private initHdTree() {
        return import('@bitgo/sdk-lib-mpc').then(async (mpc) => ({
            tree: await mpc.Ed25519Bip32HdTree.initialize(),
            bigIntFromBufferLE: mpc.bigIntFromBufferLE,
            bigIntFromBufferBE: mpc.bigIntFromBufferBE,
            bigIntToBufferLE: mpc.bigIntToBufferLE,
        }))
    }

    // commonKeychain: 128 hex chars — 32-byte pubkey (LE) + 32-byte chaincode (BE). Derives m/0.
    private async derivePublicKey(commonKeychain: string): Promise<string> {
        this.hdTree ??= this.initHdTree()
        const {
            tree,
            bigIntFromBufferLE,
            bigIntFromBufferBE,
            bigIntToBufferLE,
        } = await this.hdTree
        const buf = Buffer.from(commonKeychain, 'hex')
        const { pk } = tree.publicDerive(
            {
                pk: bigIntFromBufferLE(buf.subarray(0, 32)),
                chaincode: bigIntFromBufferBE(buf.subarray(32)),
            },
            'm/0'
        )
        return Buffer.from(bigIntToBufferLE(pk, 32)).toString('base64')
    }

    async createKey(name: string): Promise<Key> {
        if (!this.enterpriseId)
            throw new Error(
                'enterpriseId is required to create BitGo custodial wallets (set signingProviders.bitgo.enterpriseId).'
            )
        const wallet = await this.request<BitGoWallet>(
            'POST',
            `/api/v2/${this.coin}/wallet`,
            {
                label: name,
                coin: this.coin,
                type: 'custodial',
                multisigType: 'tss',
                enterprise: this.enterpriseId,
            }
        )
        if (!wallet.keys[0])
            throw new Error(
                `Wallet ${wallet.id} has no associated keychain — expected a TSS custodial wallet.`
            )
        const keychain = await this.request<BitGoKeychain>(
            'GET',
            `/api/v2/${this.coin}/key/${wallet.keys[0]}`
        )
        const publicKey = await this.derivePublicKey(keychain.commonKeychain)
        this.keyMap.set(publicKey, wallet.id)
        this.walletKeyMap.set(wallet.id, publicKey)
        return { id: wallet.id, name: wallet.label, publicKey }
    }

    async signTransaction(params: {
        tx: string
        txHash: string
        walletId: string
        /** Optional: caller-provided payload type. Falls back to local JSON-vs-proto detection. */
        messageStandardType?: string
    }): Promise<{ txId: string }> {
        const messageStandardType =
            params.messageStandardType ?? detectPayloadType(params.tx)
        const response = await this.request<BitGoTxRequest>(
            'POST',
            `/api/v2/wallet/${params.walletId}/msgrequests`,
            {
                intent: {
                    intentType: 'signMessage',
                    messageRaw: params.txHash,
                    messageStandardType,
                    preparedTransaction: unwrapTopologyPayload(params.tx),
                },
                apiVersion: 'full',
            }
        )
        this.txStoreSet(response.txRequestId, params.walletId)
        return { txId: response.txRequestId }
    }

    async getTransaction(txId: string): Promise<BitGoTransaction | undefined> {
        const walletId = this.txStore.get(txId)
        if (walletId) return this.fetchTxRequest(txId, walletId)
        if (!this.enterpriseId) return undefined
        const { txRequests } = await this.request<{
            txRequests: BitGoTxRequest[]
        }>(
            'GET',
            `/api/v2/enterprise/${this.enterpriseId}/txrequests?txRequestIds=${encodeURIComponent(txId)}&apiVersion=full&latest=true`
        )
        const txReq = txRequests[0]
        if (!txReq) return undefined
        this.txStoreSet(txId, txReq.walletId)
        return this.formatTxRequest(txId, txReq.walletId, txReq)
    }

    async fetchTxRequest(
        txId: string,
        walletId: string
    ): Promise<BitGoTransaction> {
        const { txRequests } = await this.request<{
            txRequests: BitGoTxRequest[]
        }>(
            'GET',
            `/api/v2/wallet/${walletId}/txrequests?txRequestIds=${encodeURIComponent(txId)}&apiVersion=full&latest=true`
        )
        if (!txRequests[0])
            throw new Error(`txRequest ${txId} not found in wallet ${walletId}`)
        return this.formatTxRequest(txId, walletId, txRequests[0])
    }

    async *getTransactions(params: {
        txIds?: string[]
        publicKeys?: string[]
    }): AsyncGenerator<BitGoTransaction> {
        for (const txId of params.txIds ?? []) {
            const tx = await this.getTransaction(txId)
            if (tx) yield tx
        }
        let keysRefreshed = false
        for (const publicKey of params.publicKeys ?? []) {
            let walletId = this.keyMap.get(publicKey)
            if (walletId === undefined && !keysRefreshed) {
                await this.getKeys()
                keysRefreshed = true
                walletId = this.keyMap.get(publicKey)
            }
            if (!walletId) continue
            let prevId: string | undefined
            do {
                const qs = `apiVersion=full&latest=true&limit=500${prevId ? `&prevId=${encodeURIComponent(prevId)}` : ''}`
                const { txRequests, nextBatchPrevId } = await this.request<{
                    txRequests: BitGoTxRequest[]
                    nextBatchPrevId?: string
                }>('GET', `/api/v2/wallet/${walletId}/txrequests?${qs}`)
                for (const txReq of txRequests)
                    yield await this.formatTxRequest(
                        txReq.txRequestId,
                        walletId,
                        txReq
                    )
                prevId = nextBatchPrevId
            } while (prevId)
        }
    }

    async getKeys(): Promise<Key[]> {
        const newKeyMap = new Map<string, string>()
        const newWalletKeyMap = new Map<string, string>()
        const keys: Key[] = []
        let prevId: string | undefined
        do {
            const qs = `coin=${this.coin}&type=custodial&limit=500${prevId ? `&prevId=${encodeURIComponent(prevId)}` : ''}`
            const { wallets, nextBatchPrevId } = await this.request<{
                wallets: BitGoWallet[]
                nextBatchPrevId?: string
            }>('GET', `/api/v2/wallets?${qs}`)
            for (const w of wallets) {
                if (!w.keys[0]) continue
                const keychain = await this.request<BitGoKeychain>(
                    'GET',
                    `/api/v2/${this.coin}/key/${w.keys[0]}`
                )
                const publicKey = await this.derivePublicKey(
                    keychain.commonKeychain
                )
                newKeyMap.set(publicKey, w.id)
                newWalletKeyMap.set(w.id, publicKey)
                keys.push({ id: w.id, name: w.label, publicKey })
            }
            prevId = nextBatchPrevId
        } while (prevId)
        // Atomic swap — only replace caches after all pages succeed.
        this.keyMap = newKeyMap
        this.walletKeyMap = newWalletKeyMap
        return keys
    }

    // messages[0].txHash is a hex-encoded JSON blob containing the signature and signer fingerprint.
    private extractSignedData(txHash: string | undefined): {
        signature?: string
        signedBy?: string
    } {
        if (!txHash) return {}
        try {
            const parsed = JSON.parse(
                Buffer.from(txHash, 'hex').toString('utf8')
            )
            return {
                signature: parsed?.serializedSignatures?.[0]?.signature as
                    string | undefined,
                signedBy: parsed?.signers?.[0] as string | undefined,
            }
        } catch {
            return {}
        }
    }

    // Resolves publicKey from cache; fetches from BitGo on miss (e.g. after process restart).
    private async resolvePublicKey(
        walletId: string
    ): Promise<string | undefined> {
        const cached = this.walletKeyMap.get(walletId)
        if (cached !== undefined) return cached
        try {
            const wallet = await this.request<BitGoWallet>(
                'GET',
                `/api/v2/${this.coin}/wallet/${walletId}`
            )
            if (!wallet.keys[0]) return undefined
            const keychain = await this.request<BitGoKeychain>(
                'GET',
                `/api/v2/${this.coin}/key/${wallet.keys[0]}`
            )
            const publicKey = await this.derivePublicKey(
                keychain.commonKeychain
            )
            this.keyMap.set(publicKey, walletId)
            this.walletKeyMap.set(walletId, publicKey)
            return publicKey
        } catch {
            return undefined
        }
    }

    private async formatTxRequest(
        txId: string,
        walletId: string,
        txReq: BitGoTxRequest
    ): Promise<BitGoTransaction> {
        // Message-level state takes precedence: signing is complete once messages[0].state === 'signed',
        // even if the txRequest is still in 'pendingDelivery'.
        const messageState = txReq.messages?.[0]?.state
        const rawStatus: SigningStatus =
            messageState === 'signed'
                ? 'signed'
                : (BITGO_STATE_TO_CANTON[txReq.state] ?? 'pending')
        const signedData =
            rawStatus === 'signed'
                ? this.extractSignedData(txReq.messages?.[0]?.txHash)
                : {}
        // Terminal states will never change — fail fast if signature extraction failed.
        const isTerminal =
            txReq.state === 'delivered' || txReq.state === 'signed'
        const status: SigningStatus =
            rawStatus === 'signed' && !signedData.signature
                ? isTerminal
                    ? 'failed'
                    : 'pending'
                : rawStatus
        const { signature, signedBy } = status === 'signed' ? signedData : {}
        const publicKey = await this.resolvePublicKey(walletId)
        const tx: BitGoTransaction = { txId, status }
        if (signature !== undefined) tx.signature = signature
        if (publicKey !== undefined) tx.publicKey = publicKey
        if (signedBy !== undefined) tx.metadata = { signedBy }
        return tx
    }
}
