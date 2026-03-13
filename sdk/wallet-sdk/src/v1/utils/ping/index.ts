// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../../sdk.js'
import { v4 } from 'uuid'

export class Ping {
    constructor(private readonly ctx: WalletSdkContext) {}

    public create(parties: { initiator: PartyId; responder: PartyId }[]) {
        return parties.map(({ initiator, responder }) => ({
            CreateCommand: {
                templateId:
                    '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                createArguments: {
                    id: v4(),
                    initiator,
                    responder,
                },
            },
        }))
    }
}
