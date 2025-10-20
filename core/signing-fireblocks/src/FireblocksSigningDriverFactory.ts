// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    SigningProvider,
    SigningDriverInterface,
    SigningDriverFactory,
    SigningDriverStore,
} from '@canton-network/core-signing-lib'
import { SigningDriverProxy } from '@canton-network/core-signing-lib'
import FireblocksSigningDriver from './index.js'
import { FireblocksApiKeyInfo } from './fireblocks.js'

export class FireblocksSigningDriverFactory implements SigningDriverFactory {
    readonly provider = SigningProvider.FIREBLOCKS

    createDriver(
        properties: Record<string, unknown>,
        store: SigningDriverStore
    ): SigningDriverInterface {
        const fireblocksConfig = this.createFireblocksConfig(properties)
        return new SigningDriverProxy(
            new FireblocksSigningDriver(fireblocksConfig),
            store,
            this.provider
        )
    }

    private createFireblocksConfig(properties: Record<string, unknown>) {
        const {
            apiPath = 'https://api.fireblocks.io/v1',
            defaultApiKey,
            userApiKeys = {},
        } = properties

        return {
            defaultKeyInfo: defaultApiKey as FireblocksApiKeyInfo | undefined,
            userApiKeys: new Map(
                Object.entries(
                    userApiKeys as Record<string, FireblocksApiKeyInfo>
                )
            ) as Map<string, FireblocksApiKeyInfo>,
            apiPath: apiPath as string,
        }
    }
}
