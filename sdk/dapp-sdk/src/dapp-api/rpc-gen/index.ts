// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Status } from './typings.js'
import { Connect } from './typings.js'
import { Disconnect } from './typings.js'
import { GetActiveNetwork } from './typings.js'
import { PrepareExecute } from './typings.js'
import { PrepareExecuteAndWait } from './typings.js'
import { SignMessage } from './typings.js'
import { LedgerApi } from './typings.js'
import { AccountsChanged } from './typings.js'
import { GetPrimaryAccount } from './typings.js'
import { ListAccounts } from './typings.js'
import { TxChanged } from './typings.js'

export type Methods = {
    status: Status
    connect: Connect
    disconnect: Disconnect
    getActiveNetwork: GetActiveNetwork
    prepareExecute: PrepareExecute
    prepareExecuteAndWait: PrepareExecuteAndWait
    signMessage: SignMessage
    ledgerApi: LedgerApi
    accountsChanged: AccountsChanged
    getPrimaryAccount: GetPrimaryAccount
    listAccounts: ListAccounts
    txChanged: TxChanged
}

function buildController(methods: Methods) {
    return {
        status: methods.status,
        connect: methods.connect,
        disconnect: methods.disconnect,
        getActiveNetwork: methods.getActiveNetwork,
        prepareExecute: methods.prepareExecute,
        prepareExecuteAndWait: methods.prepareExecuteAndWait,
        signMessage: methods.signMessage,
        ledgerApi: methods.ledgerApi,
        accountsChanged: methods.accountsChanged,
        getPrimaryAccount: methods.getPrimaryAccount,
        listAccounts: methods.listAccounts,
        txChanged: methods.txChanged,
    }
}

export default buildController
