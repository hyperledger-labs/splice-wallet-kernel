import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'
import { signTransactionHash } from '@canton-network/core-signing-lib'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    //Online signing
    const keys = sdk.keys.generate()

    await sdk.party.external
        .create(keys.publicKey, {
            partyHint: 'snippet-party-hint',
        })
        .sign(keys.privateKey)
        .execute()

    //offline signing where the keys are held externally
    const offlineSigningKeys = sdk.keys.generate()

    const receiverPartyCreation = sdk.party.external.create(
        offlineSigningKeys.publicKey,
        {
            partyHint: 'offline-signing-party',
        }
    )

    const unsignedReceiver = await receiverPartyCreation.topology()

    // offline signing simulation - in most cases a signing provider would sign the multihash
    const receiverPartySignature = signTransactionHash(
        unsignedReceiver.multiHash,
        offlineSigningKeys.privateKey
    )

    await receiverPartyCreation.execute(receiverPartySignature)
}
