import { TopologyController } from '@splice/sdk-wallet'
const publicKey = 'your-public-key-here'
// static method call
const fingerPrint = TopologyController.createFingerprintFromPublicKey(publicKey)
