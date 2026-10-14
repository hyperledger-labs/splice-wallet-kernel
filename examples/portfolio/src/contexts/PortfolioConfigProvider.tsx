// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import type { PortfolioConfig } from '@lib/schemas'
import { PortfolioConfigContext } from '@contexts/PortfolioConfigContext'

export const PortfolioConfigProvider = ({
    children,
    config,
}: {
    children: ReactNode
    config: PortfolioConfig
}) => {
    return (
        <PortfolioConfigContext.Provider value={config}>
            {children}
        </PortfolioConfigContext.Provider>
    )
}
