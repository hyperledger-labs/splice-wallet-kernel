import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const token = await sdk.token(global.TOKEN_NAMESPACE_CONFIG)

    const sender = global.EXISTING_PARTY_1
    const receiver = global.EXISTING_PARTY_2

    const [transferCommand, disclosedContracts] = await token.transfer.create({
        sender,
        recipient: receiver,
        amount: '2000',
        instrumentId: 'Amulet',
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

    sdk.ledger.prepare({
        partyId: sender,
        commands: transferCommand,
        disclosedContracts,
    })
}
