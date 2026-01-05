// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import { RegistryServiceProvider } from './contexts/RegistriesServiceProvider'
import { ConnectionProvider } from './contexts/ConnectionProvider'
import { PortfolioProvider } from './contexts/PortfolioProvider'
import { HoldingsTab } from './oldcomponents/HoldingsTab'
import { RegistriesTab } from './oldcomponents/RegistriesTab'
import { PendingTransfersTab } from './oldcomponents/PendingTransfersTab'
import { TwoStepTransferTab } from './oldcomponents/TwoStepTransferTab'
import { TransactionHistoryTab } from './oldcomponents/TransactionHistoryTab'
import { ConnectionCard } from './oldcomponents/ConnectionCard'
import { AllocationsTab } from './oldcomponents/AllocationsTab'
import { Tabs } from './oldcomponents/Tabs'

const queryClient = new QueryClient()

const RealDataApp: React.FC = () => (
    <QueryClientProvider client={queryClient}>
        <RegistryServiceProvider>
            <ConnectionProvider>
                <PortfolioProvider>
                    <h1>dApp Portfolio</h1>
                    <ConnectionCard />
                    <Tabs
                        tabs={[
                            {
                                label: 'Holdings',
                                value: 'holdings',
                                content: <HoldingsTab />,
                            },
                            {
                                label: 'Transfer',
                                value: 'twoStepTransfer',
                                content: <TwoStepTransferTab />,
                            },
                            {
                                label: 'Pending Transfers',
                                value: 'pendingTransfers',
                                content: <PendingTransfersTab />,
                            },
                            {
                                label: 'Transaction History',
                                value: 'transactionHistory',
                                content: <TransactionHistoryTab />,
                            },
                            {
                                label: 'Allocations',
                                value: 'allocations',
                                content: <AllocationsTab />,
                            },
                            {
                                label: 'Registry Settings',
                                value: 'registries',
                                content: <RegistriesTab />,
                            },
                        ]}
                    />
                </PortfolioProvider>
            </ConnectionProvider>
        </RegistryServiceProvider>
    </QueryClientProvider>
)

export default RealDataApp
