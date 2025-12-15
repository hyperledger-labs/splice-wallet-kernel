// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState, useCallback } from 'react'
import { PartyId } from '@canton-network/core-types'
import { resolveTokenStandardClient } from '../services/resolve.js'
import { type Registries, RegistriesContext } from './RegistriesContext.js'

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
            setRegistries((r) => new Map(r).set(party, url))
        },
        []
    )

    const deleteRegistry = useCallback((party: PartyId) => {
        setRegistries((r) => {
            const newRegistries = new Map(r)
            newRegistries.delete(party)
            return newRegistries
        })
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
