// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createKeyPair, KeyPair } from '@canton-network/core-signing-lib'
import { WalletSdkContext } from '../sdk'

export class KeysClient {
    constructor(private readonly ctx: WalletSdkContext) {}

    /**
     *
     * @returns A base64 encoded public/private key pair
     */
    generate(): KeyPair {
        this.ctx.logger.info({
            message: 'Generating key pair',
        })
        return createKeyPair()
    }
}
