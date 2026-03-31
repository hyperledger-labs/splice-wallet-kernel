// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { TokenNamespaceConfig } from '../../../sdk.js'
import { Ledger } from '../../ledger/client.js'

export class ProxyDelegationService {
    private readonly ledger: Ledger
    constructor(private readonly ctx: TokenNamespaceConfig) {
        this.ledger = new Ledger(ctx.commonCtx)
    }

    public async create(delegateParty: PartyId) {
        const command = {
            CreateCommand: {
                templateId:
                    '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
                createArguments: {
                    provider: this.ctx.validatorParty,
                    delegate: delegateParty,
                },
            },
        }

        return await this.ledger.internal.submit({
            commands: [command],
            actAs: [this.ctx.validatorParty],
        })
    }
}
