// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AddNetwork } from './typings.js'
import { RemoveNetwork } from './typings.js'
import { CreateWallet } from './typings.js'
import { AllocateWallet } from './typings.js'
import { SetPrimaryWallet } from './typings.js'
import { RemoveWallet } from './typings.js'
import { ListWallets } from './typings.js'
import { SyncWallets } from './typings.js'
import { Sign } from './typings.js'
import { Execute } from './typings.js'
import { ListNetworks } from './typings.js'
import { AddSession } from './typings.js'
import { ListSessions } from './typings.js'

export type Methods = {
    addNetwork: AddNetwork
    removeNetwork: RemoveNetwork
    createWallet: CreateWallet
    allocateWallet: AllocateWallet
    setPrimaryWallet: SetPrimaryWallet
    removeWallet: RemoveWallet
    listWallets: ListWallets
    syncWallets: SyncWallets
    sign: Sign
    execute: Execute
    listNetworks: ListNetworks
    addSession: AddSession
    listSessions: ListSessions
}

function buildController(methods: Methods) {
    return {
        addNetwork: methods.addNetwork,
        removeNetwork: methods.removeNetwork,
        createWallet: methods.createWallet,
        allocateWallet: methods.allocateWallet,
        setPrimaryWallet: methods.setPrimaryWallet,
        removeWallet: methods.removeWallet,
        listWallets: methods.listWallets,
        syncWallets: methods.syncWallets,
        sign: methods.sign,
        execute: methods.execute,
        listNetworks: methods.listNetworks,
        addSession: methods.addSession,
        listSessions: methods.listSessions,
    }
}

export default buildController
