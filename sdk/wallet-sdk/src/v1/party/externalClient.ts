// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PublicKey } from '@canton-network/core-ledger-proto'
import { PartyClient } from './types'

export default class ExternalClient extends PartyClient {
    protected partyMode = 'external' as const
    constructor() {
        super()
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async create(publicKey: PublicKey, options?: { partyName: string }) {
        return this
    }
}
