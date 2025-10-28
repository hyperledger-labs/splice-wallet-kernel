// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@canton-network/core-types'
import { AccessTokenProvider } from './auth-service.js'
import { Auth } from './config/schema.js'

export class AuthTokenProvider implements AccessTokenProvider {
    constructor(
        private auth: Auth,
        private logger: Logger
    ) {}

    async getUserAccessToken(): Promise<string> {
        this.logger.debug('Fetching user auth token')
        // Implementation to fetch user auth token
        return 'undefined'
    }

    async getAdminAccessToken(): Promise<string> {
        this.logger.debug('Fetching admin auth token')
        // Implementation to fetch admin auth token
        return 'undefined'
    }
}
