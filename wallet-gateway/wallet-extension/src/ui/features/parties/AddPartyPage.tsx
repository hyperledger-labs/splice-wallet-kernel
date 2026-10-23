// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { walletStatusToCode } from '@canton-network/core-wallet-ui-components/logic'
import {
    BackLink,
    PageHeader,
    WalletCreateForm,
} from '@canton-network/core-wallet-ui-components/lit-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signingProvidersQuery, useCreateWallet } from './api'

export function AddPartyPage() {
    const navigate = useNavigate()
    const signingProviders = useQuery(signingProvidersQuery())
    const createWallet = useCreateWallet()
    const [selectedSigningProvider, setSelectedSigningProvider] = useState('')

    const goBack = () => void navigate({ to: '/parties' })

    return (
        <>
            <PageHeader heading="Create a new party">
                <BackLink onClick={goBack} />
            </PageHeader>

            <WalletCreateForm
                signingProviders={signingProviders.data ?? []}
                signingProvidersLoading={signingProviders.isPending}
                selectedSigningProvider={selectedSigningProvider}
                submitting={createWallet.isPending}
                onSigningProviderChange={(event) =>
                    setSelectedSigningProvider(event.signingProviderId)
                }
                onWalletCreate={(event) =>
                    createWallet.mutate(event, {
                        onSuccess: (wallet) =>
                            void navigate({
                                to: '/parties',
                                search: {
                                    createPartyStatus: walletStatusToCode(
                                        wallet.status
                                    ),
                                },
                            }),
                    })
                }
            />
        </>
    )
}
