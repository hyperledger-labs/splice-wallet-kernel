// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SDKInterface } from '@canton-network/wallet-sdk'
import defaultSdk from './defaultSdk'
import { DEFAULT_TEST_TOKEN_V1_REGISTRY_PORT } from '@canton-network/example-test-token-v1-registry'

export interface RegistryConfig {
    sdk: SDKInterface
    synchronizerId: string
    operator: {
        party: string
        keys: ReturnType<SDKInterface['keys']['generate']>
    }
    port: number
}

const createDefaultConfig = (): RegistryConfig => ({
    sdk: defaultSdk,
    synchronizerId: '',
    operator: {
        party: '',
        keys: defaultSdk.keys.generate(),
    },
    port: DEFAULT_TEST_TOKEN_V1_REGISTRY_PORT + 1,
})

export const defaultConfig: RegistryConfig = createDefaultConfig()

export class RegistryState implements RegistryConfig {
    protected constructor(private config: Partial<RegistryConfig>) {
        Object.assign(this, createDefaultConfig(), config)
    }
    sdk!: RegistryConfig['sdk']
    synchronizerId!: RegistryConfig['synchronizerId']
    operator!: RegistryConfig['operator']
    port!: RegistryConfig['port']

    private static _instance: RegistryState | null = null

    public static get instance() {
        if (!this._instance) throw new Error('must be instantiated first')
        return this._instance
    }

    public static async instantiate(config: Partial<RegistryConfig>) {
        this._instance = new RegistryState(config)
        if (!config.operator?.party) {
            const result = await this._instance.sdk.party.external
                .create(this._instance.operator.keys.publicKey, {
                    partyHint: 'operator',
                })
                .sign(this._instance.operator.keys.privateKey)
                .execute()

            this._instance.operator.party = result.partyId
        }
    }

    public reset() {
        Object.assign(this, createDefaultConfig())
    }
}
