// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    useEffect,
    useState,
    useCallback,
    createContext,
    useContext,
} from 'react'
import { PartyId } from '@canton-network/core-types'
import { resolveTokenStandardClient } from '../services'

export type Registries = Map<PartyId, string>

const loadRegistries = (): Registries => {
    const value = window.localStorage.getItem('registries')
    return value ? new Map(Object.entries(JSON.parse(value))) : new Map()
}

const storeRegistries = (r: Registries): void => {
    window.localStorage.setItem(
        'registries',
        JSON.stringify(Object.fromEntries(r))
    )
}

interface RegistriesContextType {
    registries: Registries
    setRegistry: (party: PartyId | undefined, url: string) => void
    deleteRegistry: (party: PartyId) => void
}

const RegistriesContext = createContext<RegistriesContextType | undefined>(
    undefined
)

export const useRegistries = () => {
    const ctx = useContext(RegistriesContext)
    if (!ctx)
        throw new Error('useRegistries must be used within RegistriesContext')
    return ctx
}

export const RegistriesProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [registries, setRegistries] = useState<Registries>(() =>
        loadRegistries()
    )

    const setRegistry = useCallback(
        async (party: PartyId | undefined, url: string) => {
            if (!party) {
                const tokenStandardClient = await resolveTokenStandardClient({
                    registryUrl: url,
                })
                const registryInfo = await tokenStandardClient.get(
                    '/registry/metadata/v1/info'
                )
                party = registryInfo.adminId
            }
            const newRegistries = new Map(registries).set(party, url)
            setRegistries(newRegistries)
        },
        []
    )

    const deleteRegistry = useCallback((party: PartyId) => {
        const newRegistries = new Map(registries)
        newRegistries.delete(party)
        setRegistries(newRegistries)
    }, [])

    useEffect(() => storeRegistries(registries), [registries])

    return (
        <RegistriesContext.Provider
            value={{ registries, setRegistry, deleteRegistry }}
        >
            {children}
        </RegistriesContext.Provider>
    )
}
