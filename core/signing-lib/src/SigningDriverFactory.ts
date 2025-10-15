// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SigningDriverAppConfig } from './config/schema.js'
import { SigningProvider, SigningDriverInterface } from './index.js'
import { SigningDriverStore } from './SigningDriverStore.js'

// Factory interface that each signing driver implementation must implement
export interface SigningDriverFactory {
    readonly provider: SigningProvider
    createDriver(
        properties: Record<string, unknown>,
        store: SigningDriverStore
    ): SigningDriverInterface
}

// Registry to manage all available signing driver factories
export class SigningDriverFactoryRegistry {
    private factories = new Map<SigningProvider, SigningDriverFactory>()

    register(factory: SigningDriverFactory): void {
        this.factories.set(factory.provider, factory)
    }

    createDriver(
        config: SigningDriverAppConfig,
        store: SigningDriverStore
    ): SigningDriverInterface {
        const factory = this.factories.get(config.provider)
        if (!factory) {
            throw new Error(
                `No factory registered for signing provider: ${config.provider}`
            )
        }
        return factory.createDriver(config.properties || {}, store)
    }

    getSupportedProviders(): SigningProvider[] {
        return Array.from(this.factories.keys())
    }
}

// Global registry instance
export const signingDriverFactoryRegistry = new SigningDriverFactoryRegistry()

// Utility function to create drivers from application configuration
export const createSigningDrivers = (
    configs: SigningDriverAppConfig[],
    store: SigningDriverStore
): Record<SigningProvider, SigningDriverInterface> => {
    const drivers: Partial<Record<SigningProvider, SigningDriverInterface>> = {}

    for (const config of configs) {
        drivers[config.provider as SigningProvider] =
            signingDriverFactoryRegistry.createDriver(config, store)
    }

    return drivers as Record<SigningProvider, SigningDriverInterface>
}
