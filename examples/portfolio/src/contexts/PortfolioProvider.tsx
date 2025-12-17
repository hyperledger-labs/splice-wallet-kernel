// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as portfolioServiceImplementation from '../services/portfolio-service-implementation.js'
import { PortfolioContext } from './PortfolioContext.js'

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    return (
        <PortfolioContext.Provider value={portfolioServiceImplementation}>
            {children}
        </PortfolioContext.Provider>
    )
}
