// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { SDKContext } from '../../sdk.js'
import { v4 } from 'uuid'

export class PingService {
    constructor(private readonly ctx: SDKContext) {}

    public create(
        parties: { initiator: PartyId; responder: PartyId; id?: string }[]
    ) {
        return parties.map(({ initiator, responder, id }) => ({
            CreateCommand: {
                templateId:
                    '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                createArguments: {
                    id: id ?? v4(),
                    initiator,
                    responder,
                },
            },
        }))
    }
}
