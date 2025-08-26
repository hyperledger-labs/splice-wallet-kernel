import { signTransactionHash } from '@splice/wallet-sdk'

const preparedParty = { combinedHash: 'combined-hash-here' }
const privateKey = 'your-private-key-here'

const signature = signTransactionHash(preparedParty.combinedHash, privateKey)
