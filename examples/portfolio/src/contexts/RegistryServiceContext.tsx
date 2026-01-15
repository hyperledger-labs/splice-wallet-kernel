// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState, createContext, useContext } from 'react'
import type {
    RegistryService,
    Instrument,
    Instruments,
} from '../services/registry-service.js'

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

export const useInstruments = (): Instruments => {
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

export const useInstrumentInfo = ({
    admin,
    id,
}: {
    admin: string
    id: string
}):
    | {
          registryUrl: string
          instrument: Instrument
      }
    | undefined => {
    const registryUrls = useRegistryUrls()
    const instruments = useInstruments()
    const registryUrl = registryUrls.get(admin)
    if (!registryUrl) {
        return undefined
    }
    for (const instrument of instruments.get(admin) ?? []) {
        if (instrument.id === id) {
            return { registryUrl, instrument }
        }
    }
    return undefined
}
