// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { partyStatusToast } from '@canton-network/core-wallet-ui-components/logic'
import {
    PageHeader,
    WalletList,
    WalletsSync,
} from '@canton-network/core-wallet-ui-components/lit-react'
import { useToast } from '@canton-network/core-wallet-ui-components/react'
import type { SigningProvider } from '@canton-network/core-signing-lib'
import Alert from '@mui/material/Alert'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import {
    useAllocateWallet,
    useSetPrimaryWallet,
    useSyncWallets,
    walletSyncNeededQuery,
    walletsQuery,
} from './api'

// The extension can only sign with the wallet kernel, so changing a wallet's
// signing provider isn't supported and its wallets can't be edited. A type
// import keeps the signing library out of the page.
const WALLET_KERNEL =
    'wallet-kernel' satisfies `${SigningProvider.WALLET_KERNEL}`

interface PartiesPageProps {
    /** Set by the add page, which sends the user here with the outcome */
    createPartyStatus?: string | undefined
}

export function PartiesPage({ createPartyStatus }: PartiesPageProps) {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const wallets = useQuery(walletsQuery())
    const syncNeeded = useQuery(walletSyncNeededQuery())
    const sync = useSyncWallets()
    const setPrimary = useSetPrimaryWallet()
    const allocate = useAllocateWallet()

    // Show the outcome once, then drop it from the URL so that a reload
    // doesn't repeat it. The ref keeps StrictMode's second effect run from
    // showing the toast twice.
    const handledStatus = useRef<string | undefined>(undefined)
    useEffect(() => {
        if (createPartyStatus === undefined) return
        if (handledStatus.current !== createPartyStatus) {
            handledStatus.current = createPartyStatus
            const toast = partyStatusToast(createPartyStatus)
            if (toast) showToast(toast)
        }
        void navigate({ to: '.', search: {}, replace: true })
    }, [createPartyStatus, navigate, showToast])

    return (
        <>
            <PageHeader heading="Parties">
                <WalletsSync
                    slot="title-suffix"
                    syncNeeded={syncNeeded.data === true}
                    syncing={sync.isPending}
                    onWalletsSync={() => sync.mutate()}
                />
            </PageHeader>

            {wallets.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Couldn't load the parties. {wallets.error.message}
                </Alert>
            )}

            <WalletList
                wallets={wallets.data}
                loading={setPrimary.isPending || allocate.isPending}
                nonEditableSigningProviderId={WALLET_KERNEL}
                onWalletAllocate={(event) =>
                    allocate.mutate(event.wallet.partyId)
                }
                onWalletSetPrimary={(event) =>
                    setPrimary.mutate(event.wallet.partyId)
                }
            />
        </>
    )
}
