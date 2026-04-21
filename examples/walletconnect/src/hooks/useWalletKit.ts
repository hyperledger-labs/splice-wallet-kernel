// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    walletHandler,
    subscribe,
    listWallets as fetchWallets,
    listNetworks as fetchNetworks,
    bootstrapSession,
    setPrimaryWallet as gatewaySetPrimary,
    type WalletEvent,
    type PendingProposal,
    type PendingRequest,
    type SessionInfo,
    type NetworkInfo,
} from '../walletkit'

interface Wallet {
    partyId: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
    status: string
    primary: boolean
}

export interface UseWalletKitReturn {
    /** WalletKit initialized and ready to receive connections */
    ready: boolean
    /** User has authenticated with a network on the gateway */
    authenticated: boolean
    /** The network the user selected during authentication */
    selectedNetwork: string | null
    /** Available networks from gateway config */
    networks: NetworkInfo[]
    /** Connect to a network — bootstraps session then inits WalletKit */
    connectToNetwork: (networkId: string) => Promise<void>
    proposal: PendingProposal | null
    pendingRequest: PendingRequest | null
    sessions: SessionInfo[]
    wallets: Wallet[]
    pair: (uri: string) => Promise<void>
    approveProposal: (id: number, networkId: string) => Promise<void>
    rejectProposal: (id: number) => Promise<void>
    approveRequest: (id: number) => Promise<unknown>
    rejectRequest: (id: number) => Promise<void>
    disconnectSession: (topic: string) => Promise<void>
    setPrimaryWallet: (partyId: string) => Promise<void>
    refreshSessions: () => void
    refreshWallets: () => void
}

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID as string

export function useWalletKit(): UseWalletKitReturn {
    const [ready, setReady] = useState(false)
    const [authenticated, setAuthenticated] = useState(false)
    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
    const [networks, setNetworks] = useState<NetworkInfo[]>([])
    const [proposal, setProposal] = useState<PendingProposal | null>(null)
    const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(
        null
    )
    const [sessions, setSessions] = useState<SessionInfo[]>([])
    const [wallets, setWallets] = useState<Wallet[]>([])
    const initRef = useRef(false)

    const refreshSessions = useCallback(() => {
        setSessions(walletHandler.getActiveSessions())
    }, [])

    const refreshWallets = useCallback(() => {
        fetchWallets()
            .then((w) => setWallets(w as Wallet[]))
            .catch(() => {})
    }, [])

    // Fetch available networks on mount (unauthenticated)
    useEffect(() => {
        if (initRef.current) return
        initRef.current = true
        fetchNetworks()
            .then(setNetworks)
            .catch((err) =>
                console.error('[useWalletKit] Failed to fetch networks', err)
            )
    }, [])

    // Connect: bootstrap session on gateway, then init WalletKit
    const connectToNetwork = useCallback(
        async (networkId: string) => {
            if (!WC_PROJECT_ID) {
                throw new Error('Missing VITE_WC_PROJECT_ID env var')
            }

            // 1. Authenticate with the gateway
            await bootstrapSession(networkId)
            setSelectedNetwork(networkId)
            setAuthenticated(true)

            // 2. Init WalletKit
            await walletHandler.init(WC_PROJECT_ID)
            setReady(true)

            // 3. Load data now that we're authenticated
            refreshSessions()
            refreshWallets()
        },
        [refreshSessions, refreshWallets]
    )

    // Subscribe to handler events
    useEffect(() => {
        return subscribe((event: WalletEvent) => {
            switch (event.type) {
                case 'proposal':
                    setProposal(event.proposal)
                    break
                case 'proposal_resolved':
                    setProposal(null)
                    refreshSessions()
                    refreshWallets()
                    break
                case 'request':
                    setPendingRequest(event.request)
                    break
                case 'request_resolved':
                    setPendingRequest(null)
                    break
                case 'session_deleted':
                case 'sessions_changed':
                    refreshSessions()
                    break
            }
        })
    }, [refreshSessions, refreshWallets])

    return {
        ready,
        authenticated,
        selectedNetwork,
        networks,
        connectToNetwork,
        proposal,
        pendingRequest,
        sessions,
        wallets,
        pair: walletHandler.pair,
        approveProposal: walletHandler.approveProposal,
        rejectProposal: walletHandler.rejectProposal,
        approveRequest: walletHandler.approveRequest,
        rejectRequest: walletHandler.rejectRequest,
        disconnectSession: walletHandler.disconnectSession,
        setPrimaryWallet: async (partyId: string) => {
            await gatewaySetPrimary(partyId)
            refreshWallets()
        },
        refreshSessions,
        refreshWallets,
    }
}
