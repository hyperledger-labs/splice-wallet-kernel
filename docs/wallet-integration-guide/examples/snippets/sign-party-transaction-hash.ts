import { signTransactionHash } from '@canton-network/wallet-sdk'

const preparedParty = { combinedHash: 'combined-hash-here' }
const privateKey = 'your-private-key-here'

const signature = signTransactionHash(preparedParty.combinedHash, privateKey)
