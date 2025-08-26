import { TopologyController } from '@splice/wallet-sdk'
const publicKey = 'your-public-key-here'
// static method call
const fingerPrint = TopologyController.createFingerprintFromPublicKey(publicKey)
