// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import {
    type RegistryUrls,
    RegistryServiceImplementation,
} from '../services/registry-service.js'
import { RegistryServiceContext } from './RegistryServiceContext.js'

const loadRegistryUrls = (): RegistryUrls => {
    const value = window.localStorage.getItem('registries')
    return value ? new Map(Object.entries(JSON.parse(value))) : new Map()
}

const storeRegistryUrls = (r: RegistryUrls): void => {
    window.localStorage.setItem(
        'registries',
        JSON.stringify(Object.fromEntries(r))
    )
}

const logger = pino({ name: 'example-portfolio', level: 'debug' })
const registryService = new RegistryServiceImplementation({
    logger,
    registryUrls: loadRegistryUrls(),
})
registryService.addOnRegistryUrlsChangeListener((registryUrls) =>
    storeRegistryUrls(registryUrls)
)

export const RegistryServiceProvider: React.FC<{
    children: React.ReactNode
}> = ({ children }) => {
    return (
        <RegistryServiceContext.Provider value={registryService}>
            {children}
        </RegistryServiceContext.Provider>
    )
}
