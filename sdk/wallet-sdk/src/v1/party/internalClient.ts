// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyClient } from './types'

export default class InternalPartyClient extends PartyClient {
    protected partyMode = 'internal' as const
    constructor() {
        super()
    }
}
