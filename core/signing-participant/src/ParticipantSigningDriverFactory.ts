// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    SigningProvider,
    SigningDriverInterface,
    SigningDriverFactory,
    SigningDriverStore,
    SigningDriverProxy,
} from '@canton-network/core-signing-lib'
import { ParticipantSigningDriver } from './controller.js'

export class ParticipantSigningDriverFactory implements SigningDriverFactory {
    readonly provider = SigningProvider.PARTICIPANT

    createDriver(
        _properties: Record<string, unknown>,
        store: SigningDriverStore
    ): SigningDriverInterface {
        return new SigningDriverProxy(
            new ParticipantSigningDriver(),
            store,
            this.provider
        )
    }
}
