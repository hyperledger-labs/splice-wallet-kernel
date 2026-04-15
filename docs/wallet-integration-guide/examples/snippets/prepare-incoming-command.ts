import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const preparedCommand = global.PREPARED_COMMAND

    const myParty = global.EXISTING_PARTY_2

    sdk.ledger.prepare({
        partyId: myParty,
        commands: preparedCommand,
    })
}
