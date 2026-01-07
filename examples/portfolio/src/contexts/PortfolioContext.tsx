// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from 'react'
import { type PortfolioService } from '../services/portfolio-service'

export const PortfolioContext = createContext<PortfolioService | undefined>(
    undefined
)

export const usePortfolio = () => {
    const ctx = useContext(PortfolioContext)
    if (!ctx)
        throw new Error('usePortfolio must be used within PortfolioContext')
    return ctx
}
