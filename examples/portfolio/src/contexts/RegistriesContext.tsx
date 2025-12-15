// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from 'react'
import { PartyId } from '@canton-network/core-types'

export type Registries = Map<PartyId, string>

interface RegistriesContextType {
    registries: Registries
    setRegistry: (party: PartyId | undefined, url: string) => void
    deleteRegistry: (party: PartyId) => void
}

export const RegistriesContext = createContext<
    RegistriesContextType | undefined
>(undefined)

export const useRegistries = () => {
    const ctx = useContext(RegistriesContext)
    if (!ctx)
        throw new Error('useRegistries must be used within RegistriesContext')
    return ctx
}
