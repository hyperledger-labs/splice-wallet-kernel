// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { AuthController } from './authController.js'

/**
 * Adapter to make AuthController compatible with AccessTokenProvider interface
 */
export class AuthTokenProvider implements AccessTokenProvider {
    constructor(private authController: AuthController) {}

    async getUserAccessToken(): Promise<string> {
        const authContext = await this.authController.getUserToken()
        return authContext.accessToken
    }

    async getAdminAccessToken(): Promise<string> {
        const authContext = await this.authController.getAdminToken()
        return authContext.accessToken
    }
}
