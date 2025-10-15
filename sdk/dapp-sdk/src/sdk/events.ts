// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { EventListener } from '@canton-network/core-splice-provider'

const provider = window.canton!

export async function onAccountsChanged(
    listener: EventListener<dappAPI.AccountsChangedEvent>
): Promise<void> {
    provider.on<dappAPI.AccountsChangedEvent>('accountsChanged', listener)
}

export async function onTxChanged(
    listener: EventListener<dappAPI.TxChangedEvent>
): Promise<void> {
    provider.on<dappAPI.TxChangedEvent>('txChanged', listener)
}
