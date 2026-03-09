import { Sdk } from '@canton-network/wallet-sdk'

export const createParties = async (sdk: Sdk) => {
    const senderKeys = sdk.keys.generate()

    const sender = await sdk.party.external
        .create(senderKeys.publicKey, {
            partyHint: 'TheSender',
        })
        .sign(senderKeys.privateKey)
        .execute()

    const receiverKeys = sdk.keys.generate()

    const receiver = await sdk.party.external
        .create(receiverKeys.publicKey, {
            partyHint: 'TheReceiver',
        })
        .sign(receiverKeys.privateKey)
        .execute()

    return {
        sender,
        receiver,
        senderKeys,
        receiverKeys,
    }
}
