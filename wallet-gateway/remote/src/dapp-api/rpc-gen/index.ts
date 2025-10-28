// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Status } from './typings.js'
import { Connect } from './typings.js'
import { Disconnect } from './typings.js'
import { DarsAvailable } from './typings.js'
import { PrepareReturn } from './typings.js'
import { PrepareExecute } from './typings.js'
import { LedgerApi } from './typings.js'
import { OnConnected } from './typings.js'
import { OnStatusChanged } from './typings.js'
import { OnAccountsChanged } from './typings.js'
import { RequestAccounts } from './typings.js'
import { OnTxChanged } from './typings.js'

export type Methods = {
    status: Status
    connect: Connect
    disconnect: Disconnect
    darsAvailable: DarsAvailable
    prepareReturn: PrepareReturn
    prepareExecute: PrepareExecute
    ledgerApi: LedgerApi
    onConnected: OnConnected
    onStatusChanged: OnStatusChanged
    onAccountsChanged: OnAccountsChanged
    requestAccounts: RequestAccounts
    onTxChanged: OnTxChanged
}

function buildController(methods: Methods) {
    return {
        status: methods.status,
        connect: methods.connect,
        disconnect: methods.disconnect,
        darsAvailable: methods.darsAvailable,
        prepareReturn: methods.prepareReturn,
        prepareExecute: methods.prepareExecute,
        ledgerApi: methods.ledgerApi,
        onConnected: methods.onConnected,
        onStatusChanged: methods.onStatusChanged,
        onAccountsChanged: methods.onAccountsChanged,
        requestAccounts: methods.requestAccounts,
        onTxChanged: methods.onTxChanged,
    }
}

export default buildController
