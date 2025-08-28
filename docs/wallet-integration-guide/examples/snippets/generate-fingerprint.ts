import { TopologyController } from '@canton-network/wallet-sdk'
const publicKey = 'your-public-key-here'
// static method call
const fingerPrint = TopologyController.createFingerprintFromPublicKey(publicKey)
