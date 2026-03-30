import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const myParty = global.EXISTING_PARTY_WITH_PREAPPROVAL
    const myPrivateKey = global.EXISTING_PARTY_WITH_PREAPPROVAL_KEYS.privateKey

    const amulet = await sdk.amulet(global.AMULET_NAMESPACE_CONFIG)

    const fetchedStatus = await amulet.preapproval.fetchStatus(myParty)

    if (!fetchedStatus?.templateId) {
        throw new Error(
            'No preapproval found - fetchedPreapprovalStatus is null'
        )
    }

    const [cancelPreapprovalCommand, cancelDisclosedContracts] =
        await amulet.preapproval.command.cancel({
            parties: {
                receiver: myParty,
            },
        })

    if (!cancelPreapprovalCommand) {
        throw Error(
            'Cancel preapproval command is null even though one has been created before'
        )
    }

    await sdk.ledger
        .prepare({
            partyId: myParty,
            commands: cancelPreapprovalCommand,
            disclosedContracts: cancelDisclosedContracts,
        })
        .sign(myPrivateKey)
        .execute({
            partyId: myParty,
        })
}
