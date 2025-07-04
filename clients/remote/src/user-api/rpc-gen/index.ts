// Code generated by rpc-generator DO NOT EDIT!!

import { AddNetwork } from './typings.js'
import { CreateWallet } from './typings.js'
import { RemoveWallet } from './typings.js'
import { ListWallets } from './typings.js'
import { Sign } from './typings.js'
import { Execute } from './typings.js'
import { ListNetworks } from './typings.js'

export type Methods = {
    addNetwork: AddNetwork
    createWallet: CreateWallet
    removeWallet: RemoveWallet
    listWallets: ListWallets
    sign: Sign
    execute: Execute
    listNetworks: ListNetworks
}

function buildController(methods: Methods) {
    return {
        addNetwork: methods.addNetwork,
        createWallet: methods.createWallet,
        removeWallet: methods.removeWallet,
        listWallets: methods.listWallets,
        sign: methods.sign,
        execute: methods.execute,
        listNetworks: methods.listNetworks,
    }
}

export default buildController
