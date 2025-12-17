// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import './App.css'
import { RegistryServiceProvider } from './contexts/RegistriesServiceProvider.js'
import { ConnectionProvider } from './contexts/ConnectionProvider.js'
import { PortfolioProvider } from './contexts/PortfolioProvider.js'
import { HoldingsTab } from './oldcomponents/HoldingsTab.js'
import { RegistriesTab } from './oldcomponents/RegistriesTab.js'
import { PendingTransfersTab } from './oldcomponents/PendingTransfersTab.js'
import { TwoStepTransferTab } from './oldcomponents/TwoStepTransferTab.js'
import { TransactionHistoryTab } from './oldcomponents/TransactionHistoryTab.js'
import { ConnectionCard } from './oldcomponents/ConnectionCard.js'
import { Tabs } from './oldcomponents/Tabs.js'

const RealDataApp: React.FC = () => (
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
                            label: 'Registry Settings',
                            value: 'registries',
                            content: <RegistriesTab />,
                        },
                    ]}
                />
            </PortfolioProvider>
        </ConnectionProvider>
    </RegistryServiceProvider>
)

export default RealDataApp
