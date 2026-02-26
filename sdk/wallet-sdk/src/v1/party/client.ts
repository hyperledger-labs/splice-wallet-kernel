// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../sdk.js'
import { ExternalParty } from './external/index.js'
import { InternalParty } from './internal.js'
import { defaultRetryableOptions } from '@canton-network/core-ledger-client'

export default class Party {
    public readonly internal: InternalParty
    public readonly external: ExternalParty

    constructor(private readonly ctx: WalletSdkContext) {
        this.internal = new InternalParty(ctx)
        this.external = new ExternalParty(ctx)
    }

    /**
     * Lists all parties (wallets) the user has access to.
     * @returns A list of unique party IDs.
     */
    public async list(): Promise<PartyId[]> {
        const rights = await this.ctx.ledgerClient.getWithRetry(
            '/v2/users/{user-id}/rights',
            defaultRetryableOptions,
            {
                path: { 'user-id': this.ctx.userId },
            }
        )

        // If user has admin rights, return all local parties
        if (rights.rights?.some((r) => 'CanReadAsAnyParty' in r.kind)) {
            const parties =
                await this.ctx.ledgerClient.getWithRetry('/v2/parties')
            return parties
                .partyDetails!.filter((p) => p.isLocal)
                .map((p) => p.party)
        }

        // Extract party IDs from all right types
        const parties =
            rights.rights?.flatMap((right) => {
                const { kind } = right
                if ('CanActAs' in kind) return kind.CanActAs?.value?.party ?? []
                if ('CanReadAs' in kind)
                    return kind.CanReadAs?.value?.party ?? []
                if ('CanExecuteAs' in kind)
                    return kind.CanExecuteAs?.value?.party ?? []
                return []
            }) ?? []

        return Array.from(new Set(parties))
    }
}
