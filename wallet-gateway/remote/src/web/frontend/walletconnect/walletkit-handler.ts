// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { WalletKitTypes } from '@reown/walletkit'
import type { SessionTypes } from '@walletconnect/types'
import { toRelPath } from '@canton-network/core-wallet-ui-components'

import { initWalletKit, getWalletKit } from './walletkit-client'
import { createUserClient } from '../rpc-client'
import { stateManager } from '../state-manager'
import type {
    PendingProposal,
    PendingRequest,
    SessionInfo,
    QueuedProposal,
    QueuedRequest,
} from './types'

const CANTON_PREFIX = 'canton_'
const DEFAULT_CHAIN = 'canton:devnet'

function stripCantonPrefix(method: string): string {
    return method.startsWith(CANTON_PREFIX)
        ? method.slice(CANTON_PREFIX.length)
        : method
}

// ── Gateway RPC helpers (User API only) ──

async function getUserClient() {
    return createUserClient(stateManager.accessToken.get())
}

async function bootstrapSession(networkId: string): Promise<{ id: string }> {
    const client = await getUserClient()
    const result = await client.request({
        method: 'addSession',
        params: { networkId },
    })
    return result as { id: string }
}

async function getPrimaryWallet(): Promise<{
    partyId: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
    status: string
    primary: boolean
}> {
    const client = await getUserClient()
    const wallets = await client.request({
        method: 'listWallets',
        params: {},
    })
    const primary = wallets.find((w) => w.primary)
    if (!primary) throw new Error('No primary wallet configured on gateway')
    return primary
}

async function handleListAccounts(): Promise<unknown> {
    const client = await getUserClient()
    return client.request({ method: 'listWallets', params: {} })
}

async function handleGetPrimaryAccount(): Promise<unknown> {
    return getPrimaryWallet()
}

async function handleGetActiveNetwork(): Promise<unknown> {
    const client = await getUserClient()
    const { sessions } = await client.request({ method: 'listSessions' })
    const session = sessions[0]
    if (!session) throw new Error('No active session')
    return {
        networkId: session.network.id,
        ledgerApi: session.network.ledgerApi,
        accessToken: session.accessToken,
    }
}

async function handleStatus(): Promise<unknown> {
    const client = await getUserClient()
    const { sessions } = await client.request({ method: 'listSessions' })
    const session = sessions[0]
    if (!session) {
        return {
            provider: { id: 'walletconnect', providerType: 'mobile' },
            connection: {
                isConnected: false,
                isNetworkConnected: false,
            },
        }
    }
    return {
        provider: { id: 'walletconnect', providerType: 'mobile' },
        connection: {
            isConnected: true,
            reason: 'OK',
            isNetworkConnected: session.status === 'connected',
            networkReason: session.reason ?? 'OK',
        },
        network: {
            networkId: session.network.id,
            ledgerApi: session.network.ledgerApi,
            accessToken: session.accessToken,
        },
    }
}

let jsonRpcId = 0

async function callDappApi(method: string, params: unknown): Promise<unknown> {
    const token = stateManager.accessToken.get()
    const res = await fetch(toRelPath('/api/v0/dapp'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: ++jsonRpcId,
            method,
            params: params ?? {},
        }),
    })

    const body = await res.json()
    if (body.error) {
        throw new Error(body.error.message || JSON.stringify(body.error))
    }
    return body.result
}

interface PrepareSignExecuteResult {
    status: 'executed'
    commandId: string
    payload: {
        updateId: string
        completionOffset: number
    }
}

async function prepareSignExecute(
    params: Record<string, unknown>
): Promise<PrepareSignExecuteResult> {
    const prepResult = (await callDappApi('prepareExecute', params)) as {
        userUrl: string
    }

    const url = new URL(prepResult.userUrl, window.location.origin)
    const commandId = url.searchParams.get('commandId')
    if (!commandId) throw new Error('No commandId in prepareExecute response')

    const { partyId } = await getPrimaryWallet()
    const userClient = await getUserClient()

    const signResult = await userClient.request({
        method: 'sign',
        params: { commandId, partyId },
    })

    if (signResult.status !== 'signed') {
        throw new Error(`Sign returned status: ${signResult.status}`)
    }

    const execResult = await userClient.request({
        method: 'execute',
        params: {
            commandId,
            partyId,
            signature: signResult.signature,
            signedBy: signResult.signedBy,
        },
    })

    return {
        status: 'executed',
        commandId,
        payload: {
            updateId: execResult.updateId ?? '',
            completionOffset: execResult.completionOffset ?? 0,
        },
    }
}

const AUTO_DISPATCH: Record<string, (params: unknown) => Promise<unknown>> = {
    canton_status: () => handleStatus(),
    canton_listAccounts: () => handleListAccounts(),
    canton_getPrimaryAccount: () => handleGetPrimaryAccount(),
    canton_getActiveNetwork: () => handleGetActiveNetwork(),
    // ledgerApi proxies to the ledger — no User API equivalent
    canton_ledgerApi: (params) => callDappApi('ledgerApi', params),
}

export interface WalletHandler {
    init(projectId: string): Promise<void>
    pair(uri: string): Promise<void>
    getPendingProposals(): PendingProposal[]
    getPendingRequests(): PendingRequest[]
    getActiveSessions(): SessionInfo[]
    approveProposal(id: number, networkId: string): Promise<void>
    rejectProposal(id: number): Promise<void>
    approveRequest(id: number): Promise<unknown>
    rejectRequest(id: number): Promise<void>
    disconnectSession(topic: string): Promise<void>
}

export type WalletEventCallback = (event: WalletEvent) => void

export type WalletEvent =
    | { type: 'proposal'; proposal: PendingProposal }
    | { type: 'request'; request: PendingRequest }
    | { type: 'proposal_resolved'; id: number; action: string }
    | { type: 'request_resolved'; id: number; action: string; error?: string }
    | { type: 'session_deleted'; topic: string }
    | { type: 'sessions_changed' }

const pendingProposals = new Map<number, QueuedProposal>()
const pendingRequests = new Map<number, QueuedRequest>()

const listeners = new Set<WalletEventCallback>()

function emit(event: WalletEvent): void {
    listeners.forEach((fn) => fn(event))
}

export function subscribe(cb: WalletEventCallback): () => void {
    listeners.add(cb)
    return () => listeners.delete(cb)
}

function partyToCaip10(chain: string, partyId: string): string {
    return `${chain}:${encodeURIComponent(partyId)}`
}

async function autoDispatch(method: string, params: unknown): Promise<unknown> {
    const handler = AUTO_DISPATCH[method]
    if (!handler) throw new Error(`Unknown auto-dispatch method: ${method}`)
    return handler(params)
}

function setupListeners(): void {
    const wk = getWalletKit()
    if (!wk) return

    wk.on(
        'session_proposal',
        async (proposal: WalletKitTypes.SessionProposal) => {
            const peer = proposal.params.proposer.metadata
            const cantonNs =
                proposal.params.requiredNamespaces?.canton ??
                proposal.params.optionalNamespaces?.canton

            if (!cantonNs) {
                console.warn('[WalletKit] No canton namespace, rejecting')
                await wk.rejectSession({
                    id: proposal.id,
                    reason: {
                        code: 5100,
                        message: 'Canton namespace not found',
                    },
                })
                return
            }

            const meta: PendingProposal = {
                id: proposal.id,
                peerName: peer.name,
                peerUrl: peer.url,
                peerDescription: peer.description,
                methods: cantonNs.methods ?? [],
                events: cantonNs.events ?? [],
                chains: cantonNs.chains ?? [DEFAULT_CHAIN],
                receivedAt: new Date().toISOString(),
            }

            console.log('[WalletKit] Session proposal from', peer.name)

            new Promise<{ networkId: string }>((resolve, reject) => {
                pendingProposals.set(proposal.id, {
                    raw: proposal,
                    meta,
                    resolve,
                    reject,
                })
            }).then(
                async ({ networkId }) => {
                    try {
                        await bootstrapSession(networkId)

                        const { partyId } = await getPrimaryWallet()

                        const chains = meta.chains
                        const session = await wk.approveSession({
                            id: proposal.id,
                            namespaces: {
                                canton: {
                                    chains,
                                    accounts: chains.map((c) =>
                                        partyToCaip10(c, partyId)
                                    ),
                                    methods: meta.methods,
                                    events: meta.events,
                                },
                            },
                        })

                        console.log(
                            '[WalletKit] Session approved, topic:',
                            session.topic
                        )
                        pendingProposals.delete(proposal.id)
                        emit({
                            type: 'proposal_resolved',
                            id: proposal.id,
                            action: 'approved',
                        })
                        emit({ type: 'sessions_changed' })
                    } catch (error: unknown) {
                        console.error('[WalletKit] Approve failed', error)
                        await wk.rejectSession({
                            id: proposal.id,
                            reason: {
                                code: 5000,
                                message: (error as Error)?.message,
                            },
                        })
                        pendingProposals.delete(proposal.id)
                        emit({
                            type: 'proposal_resolved',
                            id: proposal.id,
                            action: 'rejected',
                        })
                    }
                },
                async (err) => {
                    console.log('[WalletKit] Proposal rejected by user')
                    await wk.rejectSession({
                        id: proposal.id,
                        reason: {
                            code: 5000,
                            message:
                                err instanceof Error
                                    ? err.message
                                    : 'User rejected',
                        },
                    })
                    pendingProposals.delete(proposal.id)
                    emit({
                        type: 'proposal_resolved',
                        id: proposal.id,
                        action: 'rejected',
                    })
                }
            )

            emit({ type: 'proposal', proposal: meta })
        }
    )

    wk.on('session_request', async (event: WalletKitTypes.SessionRequest) => {
        const { id, topic } = event
        const { method, params } = event.params.request

        const sessions = wk.getActiveSessions()
        const peerName = sessions[topic]?.peer?.metadata?.name ?? 'Unknown dApp'

        console.debug('[WalletKit] session_request', method, 'from', peerName)

        if (method in AUTO_DISPATCH) {
            try {
                const result = await autoDispatch(method, params)
                await wk.respondSessionRequest({
                    topic,
                    response: { id, jsonrpc: '2.0', result },
                })
            } catch (error: unknown) {
                const message =
                    error instanceof Error ? error.message : String(error)
                await wk.respondSessionRequest({
                    topic,
                    response: {
                        id,
                        jsonrpc: '2.0',
                        error: { code: 5001, message },
                    },
                })
            }
            return
        }

        const meta: PendingRequest = {
            id,
            topic,
            method,
            params,
            peerName,
            receivedAt: new Date().toISOString(),
        }

        new Promise<unknown>((resolve, reject) => {
            pendingRequests.set(id, {
                raw: event,
                meta,
                resolve,
                reject,
            })
        }).then(
            async (result) => {
                try {
                    await wk.respondSessionRequest({
                        topic,
                        response: { id, jsonrpc: '2.0', result },
                    })
                } catch (err) {
                    console.warn(
                        '[WalletKit] Failed to respond (session may be gone)',
                        err
                    )
                }
                emit({
                    type: 'request_resolved',
                    id,
                    action: 'approved',
                })
            },
            async (error) => {
                const message =
                    error instanceof Error ? error.message : String(error)
                await wk.respondSessionRequest({
                    topic,
                    response: {
                        id,
                        jsonrpc: '2.0',
                        error: { code: 5001, message },
                    },
                })
                emit({
                    type: 'request_resolved',
                    id,
                    action: 'rejected',
                    error: message,
                })
            }
        )

        emit({ type: 'request', request: meta })
    })

    wk.on('session_delete', (event: { id: number; topic: string }) => {
        console.log('[WalletKit] Session deleted', event.topic)
        emit({ type: 'session_deleted', topic: event.topic })
        emit({ type: 'sessions_changed' })
    })
}

export const walletHandler: WalletHandler = {
    async init(projectId: string) {
        await initWalletKit(projectId)
        setupListeners()

        const wk = getWalletKit()!
        const count = Object.keys(wk.getActiveSessions()).length
        if (count > 0) {
            console.log(`[WalletKit] Resumed ${count} active sessions`)
        }
    },

    async pair(uri: string) {
        const wk = getWalletKit()
        if (!wk) throw new Error('WalletKit not initialized')
        await wk.pair({ uri })
        console.log('[WalletKit] Pairing initiated')
    },

    getPendingProposals() {
        return Array.from(pendingProposals.values()).map((e) => e.meta)
    },

    getPendingRequests() {
        return Array.from(pendingRequests.values()).map((e) => e.meta)
    },

    getActiveSessions(): SessionInfo[] {
        const wk = getWalletKit()
        if (!wk) return []
        const raw = wk.getActiveSessions()
        return Object.entries(raw).map(
            ([topic, s]: [string, SessionTypes.Struct]) => ({
                topic,
                peerName: s.peer?.metadata?.name ?? 'Unknown',
                peerUrl: s.peer?.metadata?.url ?? '',
                expiry: s.expiry,
            })
        )
    },

    async approveProposal(id: number, networkId: string) {
        const entry = pendingProposals.get(id)
        if (!entry) throw new Error(`Proposal ${id} not found`)
        entry.resolve({ networkId })
    },

    async rejectProposal(id: number) {
        const entry = pendingProposals.get(id)
        if (!entry) throw new Error(`Proposal ${id} not found`)
        entry.reject(new Error('User rejected'))
    },

    async approveRequest(id: number) {
        const entry = pendingRequests.get(id)
        if (!entry) throw new Error(`Request ${id} not found`)

        const { method, params } = entry.meta

        try {
            let result: unknown

            if (method === 'canton_prepareSignExecute') {
                result = await prepareSignExecute(
                    params as Record<string, unknown>
                )
            } else if (method in AUTO_DISPATCH) {
                result = await AUTO_DISPATCH[method](params)
            } else {
                const userClient = await getUserClient()
                result = await userClient.request({
                    method: stripCantonPrefix(method),
                    params,
                } as never)
            }

            entry.resolve(result)
            pendingRequests.delete(id)
            return result
        } catch (error) {
            entry.reject(
                error instanceof Error ? error : new Error(String(error))
            )
            pendingRequests.delete(id)
            throw error
        }
    },

    async rejectRequest(id: number) {
        const entry = pendingRequests.get(id)
        if (!entry) throw new Error(`Request ${id} not found`)
        entry.reject(new Error('User rejected'))
        pendingRequests.delete(id)
    },

    async disconnectSession(topic: string) {
        const wk = getWalletKit()
        if (!wk) return
        await wk.disconnectSession({
            topic,
            reason: { code: 6000, message: 'Wallet disconnected' },
        })
        emit({ type: 'session_deleted', topic })
        emit({ type: 'sessions_changed' })
    },
}
