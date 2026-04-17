import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const partyId = EXISTING_PARTY_1
    const privateKey = EXISTING_PARTY_1_KEYS.privateKey

    const commands = PREPARED_COMMAND

    // ledger namespace is immediately available
    await sdk.ledger
        .prepare({ partyId, commands })
        .sign(privateKey)
        .execute({ partyId })
}
