// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../sdk'
import { ExternalParty } from './external'
import { InternalParty } from './internal'

export default class Party {
    public readonly internal: InternalParty
    public readonly external: ExternalParty

    constructor(private readonly ctx: WalletSdkContext) {
        this.internal = new InternalParty(ctx)
        this.external = new ExternalParty(ctx)
    }
}
