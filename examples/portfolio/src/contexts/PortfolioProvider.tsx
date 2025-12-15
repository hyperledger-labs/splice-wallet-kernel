// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PortfolioServiceImplementation } from '../services/portfolio-service.js'
import { PortfolioContext } from './PortfolioContext.js'

const portfolioService = new PortfolioServiceImplementation()

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    return (
        <PortfolioContext.Provider value={portfolioService}>
            {children}
        </PortfolioContext.Provider>
    )
}
