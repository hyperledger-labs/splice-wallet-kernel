// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { EventListener } from '@canton-network/core-splice-provider'
import { assertProvider } from '../error.js'

export async function onAccountsChanged(
    listener: EventListener<dappAPI.AccountsChangedEvent>
): Promise<void> {
    assertProvider().on<dappAPI.AccountsChangedEvent>(
        'accountsChanged',
        listener
    )
}

export async function onTxChanged(
    listener: EventListener<dappAPI.TxChangedEvent>
): Promise<void> {
    assertProvider().on<dappAPI.TxChangedEvent>('txChanged', listener)
}

export async function onStatusChanged(
    listener: EventListener<dappAPI.StatusEvent>
): Promise<void> {
    assertProvider().on<dappAPI.StatusEvent>('statusChanged', listener)
}

export async function removeOnAccountsChanged(
    listener: EventListener<dappAPI.AccountsChangedEvent>
): Promise<void> {
    assertProvider().removeListener<dappAPI.AccountsChangedEvent>(
        'accountsChanged',
        listener
    )
}

export async function removeOnTxChanged(
    listener: EventListener<dappAPI.TxChangedEvent>
): Promise<void> {
    assertProvider().removeListener<dappAPI.TxChangedEvent>(
        'txChanged',
        listener
    )
}

export async function removeOnStatusChanged(
    listener: EventListener<dappAPI.StatusEvent>
): Promise<void> {
    assertProvider().removeListener<dappAPI.StatusEvent>(
        'statusChanged',
        listener
    )
}
