// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AddNetwork } from './typings.js'
import { RemoveNetwork } from './typings.js'
import { ListNetworks } from './typings.js'
import { AddIdp } from './typings.js'
import { RemoveIdp } from './typings.js'
import { ListIdps } from './typings.js'
import { CreateWallet } from './typings.js'
import { SetPrimaryWallet } from './typings.js'
import { RemoveWallet } from './typings.js'
import { ListWallets } from './typings.js'
import { SyncWallets } from './typings.js'
import { Sign } from './typings.js'
import { Execute } from './typings.js'
import { AddSession } from './typings.js'
import { RemoveSession } from './typings.js'
import { ListSessions } from './typings.js'
import { GetTransaction } from './typings.js'
import { ListTransactions } from './typings.js'

export type Methods = {
    addNetwork: AddNetwork
    removeNetwork: RemoveNetwork
    listNetworks: ListNetworks
    addIdp: AddIdp
    removeIdp: RemoveIdp
    listIdps: ListIdps
    createWallet: CreateWallet
    setPrimaryWallet: SetPrimaryWallet
    removeWallet: RemoveWallet
    listWallets: ListWallets
    syncWallets: SyncWallets
    sign: Sign
    execute: Execute
    addSession: AddSession
    removeSession: RemoveSession
    listSessions: ListSessions
    getTransaction: GetTransaction
    listTransactions: ListTransactions
}

function buildController(methods: Methods) {
    return {
        addNetwork: methods.addNetwork,
        removeNetwork: methods.removeNetwork,
        listNetworks: methods.listNetworks,
        addIdp: methods.addIdp,
        removeIdp: methods.removeIdp,
        listIdps: methods.listIdps,
        createWallet: methods.createWallet,
        setPrimaryWallet: methods.setPrimaryWallet,
        removeWallet: methods.removeWallet,
        listWallets: methods.listWallets,
        syncWallets: methods.syncWallets,
        sign: methods.sign,
        execute: methods.execute,
        addSession: methods.addSession,
        removeSession: methods.removeSession,
        listSessions: methods.listSessions,
        getTransaction: methods.getTransaction,
        listTransactions: methods.listTransactions,
    }
}

export default buildController
