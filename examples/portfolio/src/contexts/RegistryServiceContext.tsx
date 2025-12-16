// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState, createContext, useContext } from 'react'
import { type RegistryService } from '../services/registry-service.js'

export const RegistryServiceContext = createContext<
    RegistryService | undefined
>(undefined)

export const useRegistryService = () => {
    const ctx = useContext(RegistryServiceContext)
    if (!ctx)
        throw new Error(
            'useRegistryService must be used within RegistryServiceContext'
        )
    return ctx
}

export const useRegistryUrls = () => {
    const registryService = useRegistryService()
    const [registryUrls, setRegistryUrls] = useState(
        registryService.registryUrls
    )
    useEffect(
        () =>
            registryService.addOnRegistryUrlsChangeListener((urls) => {
                setRegistryUrls(() => new Map(urls))
            }),
        [registryService]
    )
    return registryUrls
}

export const useInstruments = () => {
    const registryService = useRegistryService()
    const [instruments, setInstruments] = useState(registryService.instruments)
    useEffect(
        () =>
            registryService.addOnInstrumentsChangeListener((urls) => {
                setInstruments(() => new Map(urls))
            }),
        [registryService]
    )
    return instruments
}
