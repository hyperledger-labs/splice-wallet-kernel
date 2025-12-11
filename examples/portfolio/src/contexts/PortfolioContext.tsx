// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from 'react'
import {
    type PortfolioService,
    PortfolioServiceImplementation,
} from '../services/portfolio-service.js'

const PortfolioContext = createContext<PortfolioService | undefined>(undefined)

const portfolioService = new PortfolioServiceImplementation()

export const usePortfolio = () => {
    const ctx = useContext(PortfolioContext)
    if (!ctx)
        throw new Error('usePortfolio must be used within PortfolioContext')
    return ctx
}

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    return (
        <PortfolioContext.Provider value={portfolioService}>
            {children}
        </PortfolioContext.Provider>
    )
}
