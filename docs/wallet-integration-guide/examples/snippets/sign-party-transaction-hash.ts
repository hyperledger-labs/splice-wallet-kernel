import { createKeyPair, signTransactionHash } from '@canton-network/wallet-sdk'

export default async function () {
    const preparedParty = EXISTING_TOPOLOGY
    const keys = createKeyPair()

    signTransactionHash(preparedParty.multiHash, keys.privateKey)
}
