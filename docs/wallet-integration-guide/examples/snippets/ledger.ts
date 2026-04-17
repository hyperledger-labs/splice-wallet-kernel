import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        amulet: global.AMULET_NAMESPACE_CONFIG,
    })

    const partyId = EXISTING_PARTY_1
    const privateKey = EXISTING_PARTY_1_KEYS.privateKey

    const [commands, disclosedContracts] = await sdk.amulet.tap(partyId, '200')

    // ledger namespace is immediately available
    await sdk.ledger
        .prepare({ partyId, commands, disclosedContracts })
        .sign(privateKey)
        .execute({ partyId })
}
