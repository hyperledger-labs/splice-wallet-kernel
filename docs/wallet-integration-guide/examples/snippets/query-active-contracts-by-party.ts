// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })
    await sdk.connect()

    const myParty = global.EXISTING_PARTY_1

    // Query only your party's data via your validator.
    // You can only see contracts where you are a stakeholder (signatory or observer).
    // You cannot query other parties' data unless you are added as an observer.
    const offset = (await sdk.userLedger!.ledgerEnd()!).offset
    const myContracts = await sdk.userLedger!.activeContracts({
        offset,
        parties: [myParty],
        filterByParty: true,
    })

    return myContracts
}
