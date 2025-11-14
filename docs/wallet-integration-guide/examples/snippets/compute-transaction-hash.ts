import { TopologyController } from '@canton-network/wallet-sdk'

export default async function () {
    const transaction = global.PREPARED_TRANSACTION

    TopologyController.createTransactionHash(transaction.preparedTransaction!)
}
