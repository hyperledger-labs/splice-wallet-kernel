// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PrivateKey } from '@canton-network/core-signing-lib'
import { PartyId } from '@canton-network/core-types'

export type PreapprovalCommandArgs<Dso = never> = {
    parties: {
        receiver: PartyId
        provider: PartyId
        dso?: Dso
    }
    privateKey: PrivateKey
}

export type PreapprovalCommandArgsWithDso = PreapprovalCommandArgs<PartyId>
