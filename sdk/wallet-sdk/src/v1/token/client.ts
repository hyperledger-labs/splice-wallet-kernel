// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../sdk'
import { HOLDING_INTERFACE_ID } from '@canton-network/core-token-standard'

export class Token {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    async holdings(partyId: PartyId) {
        return await this.sdkContext.tokenStandardService.listContractsByInterface(
            HOLDING_INTERFACE_ID,
            partyId,
            undefined,
            undefined,
            true
        )
    }
}
