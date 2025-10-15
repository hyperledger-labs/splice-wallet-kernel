// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    SigningProvider,
    SigningDriverInterface,
    SigningDriverFactory,
    SigningDriverStore,
    SigningDriverProxy,
} from '@canton-network/core-signing-lib'
import { InternalSigningDriver } from './controller.js'

export class InternalSigningDriverFactory implements SigningDriverFactory {
    readonly provider = SigningProvider.WALLET_KERNEL

    createDriver(
        _properties: Record<string, unknown>,
        store: SigningDriverStore
    ): SigningDriverInterface {
        return new SigningDriverProxy(
            new InternalSigningDriver(),
            store,
            this.provider
        )
    }
}
