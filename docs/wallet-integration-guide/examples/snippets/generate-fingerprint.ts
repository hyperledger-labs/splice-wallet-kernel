import { TopologyController } from '@canton-network/wallet-sdk'

export default async function () {
    const publicKey = 'your-public-key-here'
    // static method call
    return TopologyController.createFingerprintFromPublicKey(publicKey)
}
