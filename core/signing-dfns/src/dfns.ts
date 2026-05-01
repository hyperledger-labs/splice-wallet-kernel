// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DfnsApiClient } from '@dfns/sdk'
import { AsymmetricKeySigner } from '@dfns/sdk-keysigner'
import { SigningStatus } from '@canton-network/core-signing-lib'
import { pino } from 'pino'

const logger = pino({ name: 'dfns-handler', level: 'debug' })

export type DfnsCantonNetwork = 'Canton' | 'CantonTestnet'

const CANTON_NETWORKS: ReadonlySet<string> = new Set<DfnsCantonNetwork>([
    'Canton',
    'CantonTestnet',
])

const DFNS_LIST_PAGE_SIZE = 50

export interface DfnsCredentials {
    credId: string
    privateKey: string
    authToken: string
}

export interface DfnsTransaction {
    txId: string
    status: SigningStatus
    signature?: string
    publicKey?: string
    txHash?: string
}

export interface DfnsKey {
    id: string
    name: string
    publicKey: string
    network: DfnsCantonNetwork
}

export interface DfnsWalletInfo {
    id: string
    name: string
    address: string
    network: DfnsCantonNetwork
    status: string
}

function isCantonNetwork(network: string): network is DfnsCantonNetwork {
    return CANTON_NETWORKS.has(network)
}

export class DfnsHandler {
    private client: DfnsApiClient
    private orgId: string
    private baseUrl: string

    constructor(orgId: string, baseUrl: string, credentials: DfnsCredentials) {
        this.orgId = orgId
        this.baseUrl = baseUrl
        this.client = this.createClient(credentials)
    }

    private createClient(credentials: DfnsCredentials): DfnsApiClient {
        const signer = new AsymmetricKeySigner({
            credId: credentials.credId,
            privateKey: credentials.privateKey,
        })

        return new DfnsApiClient({
            orgId: this.orgId,
            authToken: credentials.authToken,
            baseUrl: this.baseUrl,
            signer,
        })
    }

    /**
     * Create a new Canton wallet.
     */
    public async createWallet(
        name: string,
        network: DfnsCantonNetwork = 'Canton'
    ): Promise<DfnsKey> {
        try {
            const wallet = await this.client.wallets.createWallet({
                body: { network, name },
            })

            const validators = await this.client.networks.listCantonValidators({
                network: network === 'Canton' ? 'canton' : 'canton-testnet',
            })

            if (validators.items.length === 0) {
                throw new Error(
                    `No Canton validators available for network ${network}`
                )
            }

            if (validators.items.length > 1) {
                logger.warn(
                    `Multiple validators found for network ${network}, picking the first one.`
                )
            }

            const validatorId = validators.items[0].id
            const activation = await this.client.wallets.activateWallet({
                walletId: wallet.id,
                body: { validatorId },
            })
            logger.info(
                `Wallet ${wallet.id} activation initiated: ${activation.status}`
            )

            return {
                id: wallet.id,
                name: wallet.name || wallet.id,
                publicKey: wallet.signingKey.publicKey,
                network,
            }
        } catch (error) {
            logger.error(error, 'Error creating Dfns wallet')
            throw error
        }
    }

    /**
     * Iterate every Canton wallet on the org, paging through Dfns 50-at-a-time.
     */
    public async *iterateWallets(): AsyncGenerator<DfnsWalletInfo> {
        let paginationToken: string | undefined
        do {
            const response = await this.client.wallets.listWallets({
                query: {
                    limit: DFNS_LIST_PAGE_SIZE,
                    ...(paginationToken ? { paginationToken } : {}),
                },
            })

            for (const wallet of response.items) {
                if (
                    !isCantonNetwork(wallet.network) ||
                    wallet.status !== 'Active' ||
                    !wallet.address
                ) {
                    continue
                }

                yield {
                    id: wallet.id,
                    name: wallet.name || wallet.id,
                    address: wallet.address,
                    network: wallet.network,
                    status: wallet.status,
                }
            }

            paginationToken = response.nextPageToken
        } while (paginationToken)
    }

    public async listWallets(): Promise<DfnsKey[]> {
        const keys: DfnsKey[] = []
        try {
            for await (const wallet of this.iterateWallets()) {
                keys.push({
                    id: wallet.id,
                    name: wallet.name,
                    publicKey: wallet.address,
                    network: wallet.network,
                })
            }
        } catch (error) {
            logger.error(error, 'Error listing Dfns wallets')
            throw error
        }
        return keys
    }

    public async getWallet(
        walletId: string
    ): Promise<DfnsWalletInfo | undefined> {
        try {
            const wallet = await this.client.wallets.getWallet({ walletId })

            if (!isCantonNetwork(wallet.network) || !wallet.address) {
                return undefined
            }

            return {
                id: wallet.id,
                name: wallet.name || wallet.id,
                address: wallet.address,
                network: wallet.network,
                status: wallet.status,
            }
        } catch (error) {
            logger.error(error, `Error fetching wallet ${walletId}`)
            return undefined
        }
    }

    /**
     * Sign a Canton transaction using Dfns. The caller must supply a Dfns
     * walletId (resolved at the gateway from the key identifier) and a
     * deterministic externalTxId used as the Dfns idempotency key.
     */
    public async signTransaction(
        walletId: string,
        preparedTransaction: string,
        externalTxId: string
    ): Promise<DfnsTransaction> {
        try {
            const transactionHex = Buffer.from(
                preparedTransaction,
                'base64'
            ).toString('hex')

            const result = await this.client.wallets.broadcastTransaction({
                walletId,
                body: {
                    kind: 'Transaction',
                    transaction: transactionHex,
                    externalId: externalTxId,
                },
            })

            const tx: DfnsTransaction = {
                txId: result.id,
                status: this.mapStatus(result.status),
            }

            if (result.txHash) {
                tx.txHash = result.txHash
            }

            return tx
        } catch (error) {
            logger.error(error, 'Error signing transaction with Dfns')
            throw error
        }
    }

    public async getTransaction(
        walletId: string,
        txId: string
    ): Promise<DfnsTransaction | undefined> {
        try {
            const tx = await this.client.wallets.getTransaction({
                walletId,
                transactionId: txId,
            })

            const result: DfnsTransaction = {
                txId: tx.id,
                status: this.mapStatus(tx.status),
            }

            if (tx.txHash) {
                result.txHash = tx.txHash
            }

            return result
        } catch (error) {
            logger.debug(error, `Transaction ${txId} not found`)
            return undefined
        }
    }

    public async *listTransactions(
        walletId: string
    ): AsyncGenerator<DfnsTransaction> {
        let paginationToken: string | undefined
        try {
            do {
                const response = await this.client.wallets.listTransactions({
                    walletId,
                    query: {
                        limit: DFNS_LIST_PAGE_SIZE,
                        ...(paginationToken ? { paginationToken } : {}),
                    },
                })

                for (const tx of response.items) {
                    const result: DfnsTransaction = {
                        txId: tx.id,
                        status: this.mapStatus(tx.status),
                    }

                    if (tx.txHash) {
                        result.txHash = tx.txHash
                    }

                    yield result
                }

                paginationToken = response.nextPageToken
            } while (paginationToken)
        } catch (error) {
            logger.error(
                error,
                `Error listing transactions for wallet ${walletId}`
            )
            throw error
        }
    }

    /**
     * Enable transfer pre-approval for a Canton wallet.
     */
    public async enableTransferPreapproval(
        walletId: string
    ): Promise<DfnsTransaction> {
        try {
            const result = await this.client.wallets.broadcastTransaction({
                walletId,
                body: { kind: 'TransferPreapproval' },
            })

            return {
                txId: result.id,
                status: this.mapStatus(result.status),
            }
        } catch (error) {
            logger.error(error, 'Error enabling transfer pre-approval')
            throw error
        }
    }

    private mapStatus(dfnsStatus: string): SigningStatus {
        switch (dfnsStatus) {
            case 'Confirmed':
                return 'signed'
            case 'Broadcasted':
            case 'Executing':
            case 'Pending':
                return 'pending'
            case 'Rejected':
                return 'rejected'
            case 'Failed':
                return 'failed'
            default:
                logger.warn(`Unknown Dfns status: ${dfnsStatus}`)
                return 'pending'
        }
    }
}
