import { TopologyController } from '@canton-network/wallet-sdk'

export default async function () {
    // static method call
    return TopologyController.createNewKeyPair()
}
