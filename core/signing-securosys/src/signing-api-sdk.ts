// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import type {
    CreateKeyParams,
    GetTransactionParams,
    GetTransactionsParams,
    Key,
    KeyIdentifier,
    SignTransactionParams,
    SignMessageParams,
    SigningStatus,
    Transaction,
} from '@canton-network/core-signing-lib'
import { Agent, type Dispatcher } from 'undici'

export type TsbRequestStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'EXECUTED'
    | 'FAILED'
    | 'EXPIRED'
    | 'REJECTED'
    | 'CANCELLED'

export type TsbSignatureAlgorithm =
    | 'EDDSA'
    | 'SHA256_WITH_ECDSA'
    | 'SHA512_WITH_ECDSA'
    | 'NONE_WITH_EC_SCHNORR_BIP0340'
    | (string & {})

export interface TsbCreateKeyAttributes {
    encrypt?: boolean
    decrypt?: boolean
    verify?: boolean
    sign?: boolean
    wrap?: boolean
    unwrap?: boolean
    derive?: boolean
    bip32?: boolean
    slip10?: boolean
    extractable?: boolean
    modifiable?: boolean
    destroyable?: boolean
    sensitive?: boolean
    copyable?: boolean
    rollover?: boolean
    [key: string]: unknown
}

export interface TsbCreateKeyRequest {
    label: string
    password?: string
    id?: string
    algorithm?: string
    algorithmOid?: string
    curveOid?: string
    keySize?: number
    attributes: TsbCreateKeyAttributes
    policy: TsbCreateKeyPolicy
    [key: string]: unknown
}

export interface TsbCreateKeyPolicy {
    ruleUse: null
    ruleBlock: null
    ruleUnblock: null
    ruleModify: null
    keyStatus: {
        blocked: false
    }
}

export interface TsbKeyAttributes {
    label: string
    id?: string
    uuid?: string
    algorithm?: string
    algorithmOid?: string
    curveOid?: string
    publicKey?: string
    [key: string]: unknown
}

export interface TsbSignedKeyAttributes {
    xml?: string
    json: TsbKeyAttributes
    xmlSignature?: string
    attestationKeyName?: string
}

export interface TsbModifyKeyAttributes {
    newLabel?: string
    newPassword?: string
    customerNote?: string
    startDate?: string
    endDate?: string
    encrypt?: boolean
    decrypt?: boolean
    verify?: boolean
    sign?: boolean
    wrap?: boolean
    unwrap?: boolean
    derive?: boolean
    extractable?: boolean
    modifiable?: boolean
    destroyable?: boolean
    sensitive?: boolean
    copyable?: boolean
    [key: string]: unknown
}

export interface TsbModifyKeyRequest {
    label: string
    password?: string
    modifyAttributes: TsbModifyKeyAttributes
    [key: string]: unknown
}

export interface TsbSignRequest {
    payload: string
    payloadType?: string
    signKeyName: string
    keyPassword?: string
    metaData?: string
    metaDataSignature?: string
    signatureAlgorithm: TsbSignatureAlgorithm
    signatureType?: string
    context?: string
    auxiliaryRandomData?: string
    taprootTweakData?: string
    merkleRootData?: string
    [key: string]: unknown
}

export interface TsbSignedSignRequest {
    signRequest: TsbSignRequest
}

export interface TsbSignRequestResponse {
    signRequestId: string
}

export interface TsbRequestStatusResponse {
    id: string
    status: TsbRequestStatus
    executionTime?: string
    approvedBy?: string[]
    notYetApprovedBy?: string[]
    rejectedBy?: string[]
    result?: string | null
    inputOfflineHsm?: unknown
    [key: string]: unknown
}

export interface TsbRequestByStatus {
    id: string
    status: TsbRequestStatus
}

export interface TsbRequestIdsByStatusResponse {
    requests: TsbRequestByStatus[]
}

export interface SecurosysTSBClientConfig {
    baseUrl: string
    keyManagementApiKey?: string
    keyOperationApiKey?: string
    bearerToken?: string
    mtlsP12Path?: string
    mtlsP12Password?: string
    keyPassword?: string
    signatureAlgorithm?: TsbSignatureAlgorithm
}

type ApiRole = 'key-management' | 'key-operation'

const WALLET_KEY_ALGORITHM = 'ED'
const WALLET_KEY_CURVE_OID = '1.3.101.112'
const WALLET_CREATE_KEY_ATTRIBUTES: TsbCreateKeyAttributes = {
    decrypt: false,
    sign: true,
    verify: true,
    unwrap: false,
    extractable: false,
    modifiable: true,
    destroyable: true,
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const DER_OCTET_STRING_ED25519_SIGNATURE_PREFIX = Buffer.from('0440', 'hex')
const DER_BIT_STRING_ED25519_SIGNATURE_PREFIX = Buffer.from('034100', 'hex')
const WALLET_PAYLOAD_TYPE = 'UNSPECIFIED'
const WALLET_SIGNATURE_TYPE = 'RAW'
const WALLET_EMPTY_SKA_POLICY: TsbCreateKeyPolicy = {
    ruleUse: null,
    ruleBlock: null,
    ruleUnblock: null,
    ruleModify: null,
    keyStatus: {
        blocked: false,
    },
}

export function normalizePublicKey(publicKey: string): string {
    const bytes = Buffer.from(publicKey, 'base64')
    if (bytes.length === 32) {
        return publicKey
    }
    if (
        bytes.length === ED25519_SPKI_PREFIX.length + 32 &&
        bytes
            .subarray(0, ED25519_SPKI_PREFIX.length)
            .equals(ED25519_SPKI_PREFIX)
    ) {
        return bytes.subarray(ED25519_SPKI_PREFIX.length).toString('base64')
    }

    return publicKey
}

export function keyLabelFromPublicKey(publicKey: string): string {
    return normalizePublicKey(publicKey)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

export function normalizeSignature(
    signature: string,
    algorithm: TsbSignatureAlgorithm = 'EDDSA'
): string {
    const normalizedAlgorithm = String(algorithm).toUpperCase()
    if (normalizedAlgorithm !== 'EDDSA' && normalizedAlgorithm !== 'ED25519') {
        return signature
    }

    const bytes = Buffer.from(signature, 'base64')
    let rawSignature: Buffer | undefined

    if (bytes.length === 64) {
        rawSignature = bytes
    } else if (
        bytes.length ===
            DER_OCTET_STRING_ED25519_SIGNATURE_PREFIX.length + 64 &&
        bytes
            .subarray(0, DER_OCTET_STRING_ED25519_SIGNATURE_PREFIX.length)
            .equals(DER_OCTET_STRING_ED25519_SIGNATURE_PREFIX)
    ) {
        rawSignature = bytes.subarray(
            DER_OCTET_STRING_ED25519_SIGNATURE_PREFIX.length
        )
    } else if (
        bytes.length === DER_BIT_STRING_ED25519_SIGNATURE_PREFIX.length + 64 &&
        bytes
            .subarray(0, DER_BIT_STRING_ED25519_SIGNATURE_PREFIX.length)
            .equals(DER_BIT_STRING_ED25519_SIGNATURE_PREFIX)
    ) {
        rawSignature = bytes.subarray(
            DER_BIT_STRING_ED25519_SIGNATURE_PREFIX.length
        )
    } else {
        rawSignature = readDerIntegerPairSignature(bytes)
    }

    if (!rawSignature) {
        throw new Error(
            `TSB returned an ${algorithm} signature with ${bytes.length} bytes after base64 decoding; Wallet Gateway expects a raw 64-byte Ed25519 signature.`
        )
    }

    return rawSignature.toString('base64')
}

function readDerIntegerPairSignature(bytes: Buffer): Buffer | undefined {
    if (bytes[0] !== 0x30) {
        return undefined
    }

    const sequenceLength = readDerLength(bytes, 1)
    if (
        !sequenceLength ||
        sequenceLength.offset + sequenceLength.length !== bytes.length
    ) {
        return undefined
    }

    const first = readDerInteger(bytes, sequenceLength.offset)
    if (!first) {
        return undefined
    }

    const second = readDerInteger(bytes, first.offset)
    if (!second || second.offset !== bytes.length) {
        return undefined
    }

    return Buffer.concat([first.value, second.value])
}

function readDerInteger(
    bytes: Buffer,
    offset: number
): { value: Buffer; offset: number } | undefined {
    if (bytes[offset] !== 0x02) {
        return undefined
    }

    const integerLength = readDerLength(bytes, offset + 1)
    if (!integerLength) {
        return undefined
    }

    const end = integerLength.offset + integerLength.length
    if (end > bytes.length) {
        return undefined
    }

    let value = bytes.subarray(integerLength.offset, end)
    while (value.length > 32 && value[0] === 0) {
        value = value.subarray(1)
    }
    if (value.length > 32) {
        return undefined
    }
    if (value.length < 32) {
        value = Buffer.concat([Buffer.alloc(32 - value.length), value])
    }

    return { value, offset: end }
}

function readDerLength(
    bytes: Buffer,
    offset: number
): { length: number; offset: number } | undefined {
    const first = bytes[offset]
    if (first === undefined) {
        return undefined
    }

    if (first < 0x80) {
        return { length: first, offset: offset + 1 }
    }

    const lengthBytes = first & 0x7f
    if (
        lengthBytes === 0 ||
        lengthBytes > 4 ||
        offset + lengthBytes >= bytes.length
    ) {
        return undefined
    }

    let length = 0
    for (let index = 0; index < lengthBytes; index += 1) {
        length = (length << 8) | bytes[offset + 1 + index]
    }

    return { length, offset: offset + 1 + lengthBytes }
}

export function mapTsbStatus(status: TsbRequestStatus): SigningStatus {
    switch (status) {
        case 'EXECUTED':
            return 'signed'
        case 'FAILED':
            return 'failed'
        case 'REJECTED':
        case 'CANCELLED':
        case 'EXPIRED':
            return 'rejected'
        case 'PENDING':
        case 'APPROVED':
        default:
            return 'pending'
    }
}

function compact<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(
        Object.entries(value).filter(([, v]) => v !== undefined)
    ) as T
}

function encodeJsonBase64(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64')
}

/**
 * TypeScript SDK client for the Securosys TSB REST API endpoints used by the
 * Wallet Gateway signing driver.
 */
export class SigningAPIClient {
    private baseUrl: string
    private keyManagementApiKey: string | undefined
    private keyOperationApiKey: string | undefined
    private bearerToken: string | undefined
    private mtlsP12Path: string | undefined
    private mtlsP12Password: string | undefined
    private dispatcher: Dispatcher | undefined
    private keyPassword: string | undefined
    private signatureAlgorithm: TsbSignatureAlgorithm
    private transactionCache = new Map<string, Transaction>()
    private keyCache = new Map<string, Key>()
    private keyIdCache = new Map<string, Key>()

    constructor(configOrBaseUrl: SecurosysTSBClientConfig | string) {
        const config =
            typeof configOrBaseUrl === 'string'
                ? { baseUrl: configOrBaseUrl }
                : configOrBaseUrl

        this.baseUrl = normalizeBaseUrl(config.baseUrl)
        this.keyManagementApiKey = config.keyManagementApiKey
        this.keyOperationApiKey = config.keyOperationApiKey
        this.bearerToken = config.bearerToken
        this.configureMtls(config.mtlsP12Path, config.mtlsP12Password)
        this.keyPassword = config.keyPassword
        this.signatureAlgorithm = config.signatureAlgorithm ?? 'EDDSA'
    }

    private configureMtls(
        p12Path: string | undefined,
        p12Password: string | undefined
    ): void {
        const normalizedPath = p12Path || undefined
        const normalizedPassword = p12Password || undefined
        const nextDispatcher = createMtlsDispatcher(
            normalizedPath,
            normalizedPassword
        )
        const previousDispatcher = this.dispatcher

        this.mtlsP12Path = normalizedPath
        this.mtlsP12Password = normalizedPassword
        this.dispatcher = nextDispatcher

        if (previousDispatcher) {
            void previousDispatcher.close()
        }
    }

    private roleApiKey(role: ApiRole): string | undefined {
        if (role === 'key-management') {
            return this.keyManagementApiKey
        }
        return this.keyOperationApiKey
    }

    private async request<O>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        endpoint: string,
        role: ApiRole,
        body?: object
    ): Promise<O> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
        }

        if (body !== undefined) {
            headers['Content-Type'] = 'application/json'
        }

        const roleApiKey = this.roleApiKey(role)
        if (roleApiKey) {
            headers['X-API-KEY'] = roleApiKey
        }
        if (this.bearerToken) {
            headers.Authorization = `Bearer ${this.bearerToken}`
        }

        const requestInit: RequestInit & { dispatcher?: Dispatcher } = {
            method,
            headers,
            ...(body !== undefined && { body: JSON.stringify(body) }),
        }

        if (this.dispatcher) {
            requestInit.dispatcher = this.dispatcher
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, requestInit)

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(
                `TSB API call to ${endpoint} failed (${response.status}): ${errorText || response.statusText}`
            )
        }

        if (
            response.status === 204 ||
            response.headers.get('content-length') === '0'
        ) {
            return {} as O
        }

        return response.json() as Promise<O>
    }

    private get<O>(endpoint: string, role: ApiRole): Promise<O> {
        return this.request<O>('GET', endpoint, role)
    }

    private post<I extends object, O>(
        endpoint: string,
        role: ApiRole,
        body: I
    ): Promise<O> {
        return this.request<O>('POST', endpoint, role, body)
    }

    private patch<I extends object, O>(
        endpoint: string,
        role: ApiRole,
        body: I
    ): Promise<O> {
        return this.request<O>('PATCH', endpoint, role, body)
    }

    private delete<O>(endpoint: string, role: ApiRole): Promise<O> {
        return this.request<O>('DELETE', endpoint, role)
    }

    private keyFromAttributes(attributes: TsbKeyAttributes): Key {
        if (!attributes.publicKey) {
            throw new Error(
                `TSB key '${attributes.label}' does not expose a public key`
            )
        }

        return {
            id: attributes.label,
            name: attributes.label,
            publicKey: normalizePublicKey(attributes.publicKey),
        }
    }

    private cacheKey(key: Key): Key {
        const normalized = {
            ...key,
            publicKey: normalizePublicKey(key.publicKey),
        }
        this.keyCache.set(normalized.publicKey, normalized)
        this.keyCache.set(key.publicKey, normalized)
        this.keyIdCache.set(normalized.id, normalized)
        this.keyIdCache.set(normalized.name, normalized)
        return normalized
    }

    private cachedKeyById(id: string): Key | undefined {
        return this.keyIdCache.get(id)
    }

    private cachedKeyByPublicKey(publicKey: string): Key | undefined {
        return (
            this.keyCache.get(publicKey) ??
            this.keyCache.get(normalizePublicKey(publicKey))
        )
    }

    private cachedKeyForIdentifier(
        keyIdentifier: KeyIdentifier
    ): Key | undefined {
        const byId = keyIdentifier.id
            ? this.cachedKeyById(keyIdentifier.id)
            : undefined
        if (byId && keyMatchesIdentifier(byId, keyIdentifier)) {
            return byId
        }

        const byPublicKey = keyIdentifier.publicKey
            ? this.cachedKeyByPublicKey(keyIdentifier.publicKey)
            : undefined
        if (byPublicKey && keyMatchesIdentifier(byPublicKey, keyIdentifier)) {
            return byPublicKey
        }

        return undefined
    }

    private assertKeyMatchesIdentifier(
        key: Key,
        keyIdentifier: KeyIdentifier
    ): void {
        if (keyIdentifier.id && !keyMatchesId(key, keyIdentifier.id)) {
            throw new Error(
                `TSB key attributes label '${key.id}' does not match requested key id '${keyIdentifier.id}'`
            )
        }

        if (
            keyIdentifier.publicKey &&
            !publicKeysEqual(key.publicKey, keyIdentifier.publicKey)
        ) {
            throw new Error(
                `TSB key '${key.id}' public key does not match the provided keyIdentifier publicKey`
            )
        }
    }

    private transactionFromStatus(
        response: TsbRequestStatusResponse,
        cached?: Transaction
    ): Transaction {
        const cachedMetadata =
            cached?.metadata &&
            typeof cached.metadata === 'object' &&
            !Array.isArray(cached.metadata)
                ? (cached.metadata as Record<string, unknown>)
                : undefined
        const signatureAlgorithm =
            typeof cachedMetadata?.signatureAlgorithm === 'string'
                ? cachedMetadata.signatureAlgorithm
                : this.signatureAlgorithm
        const rawSignature =
            typeof response.result === 'string' && response.result.trim()
                ? response.result
                : undefined
        const signature = rawSignature
            ? normalizeSignature(rawSignature, signatureAlgorithm)
            : undefined
        const mappedStatus = mapTsbStatus(response.status)
        const status =
            mappedStatus === 'signed' && !signature ? 'pending' : mappedStatus
        const transaction: Transaction = compact({
            txId: response.id,
            status,
            signature,
            publicKey: cached?.publicKey,
            metadata: {
                ...cachedMetadata,
                ...compact({
                    tsbStatus: response.status,
                    executionTime: response.executionTime,
                    approvedBy: response.approvedBy,
                    notYetApprovedBy: response.notYetApprovedBy,
                    rejectedBy: response.rejectedBy,
                    inputOfflineHsm: response.inputOfflineHsm,
                }),
            },
        })

        this.transactionCache.set(transaction.txId, transaction)
        return transaction
    }

    private async resolveKeyIdentifier(
        keyIdentifier: KeyIdentifier
    ): Promise<Key> {
        const cached = this.cachedKeyForIdentifier(keyIdentifier)
        if (cached) {
            return cached
        }

        if (keyIdentifier.id) {
            const attributes = await this.getKeyAttributes(keyIdentifier.id)
            const key = this.keyFromAttributes(attributes.json)
            this.assertKeyMatchesIdentifier(key, keyIdentifier)
            return this.cacheKey(key)
        }

        if (keyIdentifier.publicKey) {
            const labels = await this.get<string[]>('/v1/key', 'key-management')
            let skippedKeys = 0
            for (const label of labels) {
                try {
                    const attributes = await this.getKeyAttributes(label)
                    const key = this.cacheKey(
                        this.keyFromAttributes(attributes.json)
                    )
                    if (
                        publicKeysEqual(key.publicKey, keyIdentifier.publicKey)
                    ) {
                        return key
                    }
                } catch (error) {
                    if (isSkippableKeyAttributesError(error)) {
                        skippedKeys += 1
                        continue
                    }
                    throw error
                }
            }

            throw new Error(
                `Unable to resolve TSB signing key from publicKey${
                    skippedKeys > 0
                        ? `; skipped ${skippedKeys} TSB key(s) whose attributes are not available`
                        : ''
                }`
            )
        }

        throw new Error('Unable to resolve TSB signing key from keyIdentifier')
    }

    private async getExistingTransactions(
        txIds: string[]
    ): Promise<Transaction[]> {
        const results = await Promise.allSettled(
            txIds.map((txId) => this.getTransaction({ txId }))
        )

        return results.flatMap((result, index) => {
            if (result.status === 'fulfilled') {
                return [result.value]
            }
            if (isNotFoundError(result.reason)) {
                this.transactionCache.delete(txIds[index])
                return []
            }
            throw result.reason
        })
    }

    public async signTransaction(
        params: SignTransactionParams
    ): Promise<Transaction> {
        const key = await this.resolveKeyIdentifier(params.keyIdentifier)
        const extra = params.extraParams ?? {}
        const signatureAlgorithm =
            extra.signatureAlgorithm ?? this.signatureAlgorithm
        const metadata = compact({
            internalTxId: params.internalTxId,
            userIdentifier: extra.userIdentifier,
            keyIdentifier: params.keyIdentifier,
            signatureAlgorithm,
            signatureType: WALLET_SIGNATURE_TYPE,
        })

        const signRequest: TsbSignRequest = compact({
            payload: params.txHash,
            payloadType: WALLET_PAYLOAD_TYPE,
            signKeyName: key.name,
            keyPassword: extra.keyPassword ?? this.keyPassword,
            metaData:
                extra.metaData ??
                (Object.keys(metadata).length > 0
                    ? encodeJsonBase64(metadata)
                    : undefined),
            metaDataSignature: extra.metaDataSignature,
            signatureAlgorithm,
            signatureType: WALLET_SIGNATURE_TYPE,
            context: extra.context,
            auxiliaryRandomData: extra.auxiliaryRandomData,
            taprootTweakData: extra.taprootTweakData,
            merkleRootData: extra.merkleRootData,
        })

        const response = await this.post<
            TsbSignedSignRequest,
            TsbSignRequestResponse
        >('/v1/sign', 'key-operation', { signRequest })

        const transaction: Transaction = {
            txId: response.signRequestId,
            status: 'pending',
            publicKey: key.publicKey,
            metadata,
        }
        this.transactionCache.set(transaction.txId, transaction)
        return transaction
    }

    public async signMessage(params: SignMessageParams): Promise<Transaction> {
        const key = await this.resolveKeyIdentifier(params.keyIdentifier)
        const extra = params.extraParams ?? {}
        const signatureAlgorithm =
            extra.signatureAlgorithm ?? this.signatureAlgorithm
        const metadata = compact({
            internalTxId: params.internalTxId,
            userIdentifier: extra.userIdentifier,
            keyIdentifier: params.keyIdentifier,
            signatureAlgorithm,
            signatureType: WALLET_SIGNATURE_TYPE,
        })

        const signRequest: TsbSignRequest = compact({
            payload: Buffer.from(params.message, 'utf8').toString('base64'),
            payloadType: WALLET_PAYLOAD_TYPE,
            signKeyName: key.name,
            keyPassword: extra.keyPassword ?? this.keyPassword,
            metaData:
                extra.metaData ??
                (Object.keys(metadata).length > 0
                    ? encodeJsonBase64(metadata)
                    : undefined),
            metaDataSignature: extra.metaDataSignature,
            signatureAlgorithm,
            signatureType: WALLET_SIGNATURE_TYPE,
            context: extra.context,
            auxiliaryRandomData: extra.auxiliaryRandomData,
            taprootTweakData: extra.taprootTweakData,
            merkleRootData: extra.merkleRootData,
        })

        const response = await this.post<
            TsbSignedSignRequest,
            TsbSignRequestResponse
        >('/v1/sign', 'key-operation', { signRequest })

        const transaction: Transaction = {
            txId: response.signRequestId,
            status: 'pending',
            publicKey: key.publicKey,
            metadata,
        }
        this.transactionCache.set(transaction.txId, transaction)
        return transaction
    }

    public async getTransaction(
        params: GetTransactionParams
    ): Promise<Transaction> {
        const response = await this.get<TsbRequestStatusResponse>(
            `/v1/request/${encodeURIComponent(params.txId)}`,
            'key-operation'
        )

        return this.transactionFromStatus(
            response,
            this.transactionCache.get(params.txId)
        )
    }

    public async getTransactions(
        params: GetTransactionsParams
    ): Promise<Transaction[]> {
        if (params.txIds?.length) {
            return this.getExistingTransactions(params.txIds)
        }

        if (params.publicKeys?.length) {
            const cached = Array.from(this.transactionCache.values()).filter(
                (tx) =>
                    tx.publicKey !== undefined &&
                    params.publicKeys!.some((publicKey) =>
                        publicKeysEqual(publicKey, tx.publicKey!)
                    )
            )

            return this.getExistingTransactions(cached.map((tx) => tx.txId))
        }

        const response = await this.post<
            { requestStatusList: TsbRequestStatus[] },
            TsbRequestIdsByStatusResponse
        >('/v1/filteredRequests', 'key-operation', {
            requestStatusList: [
                'PENDING',
                'APPROVED',
                'EXECUTED',
                'FAILED',
                'EXPIRED',
                'REJECTED',
                'CANCELLED',
            ],
        })

        return this.getExistingTransactions(
            response.requests.map((request) => request.id)
        )
    }

    public async getKeys(): Promise<Key[]> {
        const labels = await this.get<string[]>('/v1/key', 'key-management')

        const results = await Promise.allSettled(
            labels.map(async (label) => {
                const attributes = await this.getKeyAttributes(label)
                return this.cacheKey(this.keyFromAttributes(attributes.json))
            })
        )

        return results.flatMap((result) => {
            if (result.status === 'fulfilled') {
                return [result.value]
            }
            if (isSkippableKeyAttributesError(result.reason)) {
                return []
            }
            throw result.reason
        })
    }

    public async createKey(params: CreateKeyParams): Promise<Key> {
        const temporaryLabel = `wallet-${crypto.randomUUID()}`
        const keyPassword = params.keyPassword ?? this.keyPassword
        const request = compact({
            label: temporaryLabel,
            password: keyPassword,
            algorithm: WALLET_KEY_ALGORITHM,
            curveOid: WALLET_KEY_CURVE_OID,
            attributes: WALLET_CREATE_KEY_ATTRIBUTES,
            policy: WALLET_EMPTY_SKA_POLICY,
        }) as TsbCreateKeyRequest

        const attributes = await this.post<
            TsbCreateKeyRequest,
            TsbSignedKeyAttributes
        >('/v1/key', 'key-management', request)

        const createdKey = this.keyFromAttributes(attributes.json)
        const finalLabel = keyLabelFromPublicKey(createdKey.publicKey)
        const renamedAttributes = await this.patch<
            TsbModifyKeyRequest,
            TsbSignedKeyAttributes
        >(
            '/v1/key/changeAttributes',
            'key-management',
            compact({
                label: createdKey.id,
                password: keyPassword,
                modifyAttributes: {
                    newLabel: finalLabel,
                },
            })
        )
        const renamedKey = this.keyFromAttributes(renamedAttributes.json)
        this.assertKeyMatchesIdentifier(renamedKey, {
            id: finalLabel,
            publicKey: createdKey.publicKey,
        })

        return this.cacheKey(renamedKey)
    }

    public async getKeyAttributes(
        label: string
    ): Promise<TsbSignedKeyAttributes> {
        return this.post<
            { label: string; password?: string },
            TsbSignedKeyAttributes
        >(
            '/v1/key/attributes',
            'key-management',
            compact({
                label,
                password: this.keyPassword,
            })
        )
    }

    public async cancelTransaction(txId: string): Promise<void> {
        await this.delete(
            `/v1/request/${encodeURIComponent(txId)}`,
            'key-operation'
        )
        const cached = this.transactionCache.get(txId)
        if (cached) {
            this.transactionCache.set(txId, {
                ...cached,
                status: 'rejected',
                metadata: {
                    ...cached.metadata,
                    tsbStatus: 'CANCELLED',
                },
            })
        }
    }

    public getConfiguration(): Record<string, unknown> {
        return {
            BaseURL: this.baseUrl,
            KeyManagementApiKey: this.keyManagementApiKey,
            KeyOperationApiKey: this.keyOperationApiKey,
            BearerToken: this.bearerToken,
            MtlsP12Path: this.mtlsP12Path,
            MtlsP12Password: this.mtlsP12Password,
            KeyPassword: this.keyPassword,
            SignatureAlgorithm: this.signatureAlgorithm,
        }
    }

    public setConfiguration(params: {
        BaseURL?: string
        KeyManagementApiKey?: string
        KeyOperationApiKey?: string
        BearerToken?: string
        MtlsP12Path?: string
        MtlsP12Password?: string
        KeyPassword?: string
        SignatureAlgorithm?: TsbSignatureAlgorithm
    }): Record<string, unknown> {
        if (params.BaseURL !== undefined) {
            this.baseUrl = normalizeBaseUrl(params.BaseURL)
        }
        if (params.KeyManagementApiKey !== undefined) {
            this.keyManagementApiKey = params.KeyManagementApiKey
        }
        if (params.KeyOperationApiKey !== undefined) {
            this.keyOperationApiKey = params.KeyOperationApiKey
        }
        if (params.BearerToken !== undefined) {
            this.bearerToken = params.BearerToken
        }
        if (
            params.MtlsP12Path !== undefined ||
            params.MtlsP12Password !== undefined
        ) {
            this.configureMtls(
                params.MtlsP12Path !== undefined
                    ? params.MtlsP12Path
                    : this.mtlsP12Path,
                params.MtlsP12Password !== undefined
                    ? params.MtlsP12Password
                    : this.mtlsP12Password
            )
        }
        if (params.KeyPassword !== undefined) {
            this.keyPassword = params.KeyPassword
        }
        if (params.SignatureAlgorithm !== undefined) {
            this.signatureAlgorithm = params.SignatureAlgorithm
        }
        return this.getConfiguration()
    }
}

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function createMtlsDispatcher(
    p12Path: string | undefined,
    p12Password: string | undefined
): Dispatcher | undefined {
    if (!p12Path) {
        return undefined
    }

    return new Agent({
        connect: {
            pfx: readFileSync(p12Path),
            passphrase: p12Password,
        },
    })
}

function publicKeysEqual(left: string, right: string): boolean {
    return (
        left === right || normalizePublicKey(left) === normalizePublicKey(right)
    )
}

function keyMatchesId(key: Key, id: string): boolean {
    return key.id === id || key.name === id
}

function keyMatchesIdentifier(key: Key, keyIdentifier: KeyIdentifier): boolean {
    if (keyIdentifier.id && !keyMatchesId(key, keyIdentifier.id)) {
        return false
    }

    return (
        !keyIdentifier.publicKey ||
        publicKeysEqual(key.publicKey, keyIdentifier.publicKey)
    )
}

function isNotFoundError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('(404)')
}

function isSkippableKeyAttributesError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    if (error.message.includes('does not expose a public key')) {
        return true
    }

    if (!error.message.includes('/v1/key/attributes failed')) {
        return false
    }

    return (
        error.message.includes('(404)') ||
        error.message.includes('KEY_FUNCTION_NOT_PERMITTED') ||
        error.message.includes('res.error.key.not.existent') ||
        error.message.includes('res.error.key.password.mismatch')
    )
}
