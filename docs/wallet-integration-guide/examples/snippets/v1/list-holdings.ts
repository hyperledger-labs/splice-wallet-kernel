import { sdkSetup } from './setupTests'

export default async function () {
    const sdk = await sdkSetup()

    const key = sdk.keys.generate()

    const party = await sdk.party.external
        .create(key.publicKey, {
            partyHint: 'my-party',
        })
        .sign(key.privateKey)
        .execute()

    await sdk.token.utxos.list({ partyId: party.partyId })
}
