import {
    SDK,
    localNetStaticConfig,
    signTransactionHash,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const myParty = global.EXISTING_PARTY_1
    const keys = global.EXISTING_PARTY_1_KEYS

    const pingCommand = [
        {
            CreateCommand: {
                templateId:
                    '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                createArguments: {
                    id: v4(),
                    initiator: myParty,
                    responder: myParty,
                },
            },
        },
    ]

    const preparedPingCommand = sdk.ledger.prepare({
        partyId: myParty,
        commands: pingCommand,
        disclosedContracts: [],
    })

    const { response: preparedPingCommandResponse } =
        await preparedPingCommand.toJSON()

    const signature = signTransactionHash(
        preparedPingCommandResponse.preparedTransactionHash,
        keys.privateKey
    )

    const signed = sdk.ledger.fromSignature(
        preparedPingCommandResponse,
        signature
    )
    await sdk.ledger.execute(signed, { partyId: myParty })
}
