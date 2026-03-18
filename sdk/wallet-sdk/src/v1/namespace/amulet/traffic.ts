// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { AssetBody, WalletSdkContext } from '../../sdk.js'
import { PreparedCommand } from '../transactions/types.js'
import { Ops } from '@canton-network/core-provider-ledger'

export class Traffic {
    constructor(
        private readonly sdkContext: WalletSdkContext,
        private readonly defaultAmuletObject: AssetBody
    ) {}

    async status(params: { memberId?: string; synchronizerId?: string }) {
        const synchronizerId =
            params.synchronizerId || this.sdkContext.defaultSynchronizerId

        const memberId =
            params.memberId ??
            (
                await this.sdkContext.ledgerProvider.request<Ops.GetV2PartiesParticipantId>(
                    {
                        method: 'ledgerApi',
                        params: {
                            resource: '/v2/parties/participant-id',
                            requestMethod: 'get',
                        },
                    }
                )
            ).participantId

        return this.sdkContext.amuletService.getMemberTrafficStatus(
            synchronizerId,
            memberId
        )
    }

    async buy(params: {
        buyer: PartyId
        ccAmount: number
        memberId?: string
        inputUtxos: string[]
        migrationId?: number
        synchronizerId?: string
    }): Promise<PreparedCommand> {
        const { buyer, ccAmount, inputUtxos } = params
        const migrationId = params.migrationId ?? 0
        const defaultAmulet = this.defaultAmuletObject
        const memberId =
            params.memberId ??
            (
                await this.sdkContext.ledgerProvider.request<Ops.GetV2PartiesParticipantId>(
                    {
                        method: 'ledgerApi',
                        params: {
                            resource: '/v2/parties/participant-id',
                            requestMethod: 'get',
                        },
                    }
                )
            ).participantId

        const synchronizerId =
            params.synchronizerId || this.sdkContext.defaultSynchronizerId

        const [command, dc] =
            await this.sdkContext.amuletService.buyMemberTraffic(
                defaultAmulet.admin,
                buyer,
                ccAmount,
                synchronizerId,
                memberId,
                migrationId,
                inputUtxos
            )
        return [{ ExerciseCommand: command }, dc]
    }
}
