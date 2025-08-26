import { signTransactionHash } from '@splice/sdk-wallet'

const preparedParty = { combinedHash: 'combined-hash-here' }
const privateKey = 'your-private-key-here'

const signature = signTransactionHash(preparedParty.combinedHash, privateKey)
