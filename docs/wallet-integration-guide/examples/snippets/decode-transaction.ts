import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const sender = global.EXISTING_PARTY_1

    const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)

    const [tapCommand, disclosedContracts] = await amulet.tap(sender, '2000')

    const preparedTransaction = sdk.ledger.prepare({
        commands: tapCommand,
        disclosedContracts,
        partyId: sender,
    })

    await preparedTransaction.decode()
}
