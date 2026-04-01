import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const myParty = global.EXISTING_PARTY_1
    const myPrivateKey = global.EXISTING_PARTY_1_KEYS.privateKey
    const token = await sdk.token(global.TOKEN_NAMESPACE_CONFIG)

    const myPendingTransaction = await token.transfer.pending(myParty)

    const myPendingTransactionCid = myPendingTransaction[0].contractId

    const [withdrawTransferCommand, disclosedContracts] =
        await token.transfer.withdraw({
            transferInstructionCid: myPendingTransactionCid,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        })

    await sdk.ledger
        .prepare({
            partyId: myParty,
            commands: withdrawTransferCommand,
            disclosedContracts: disclosedContracts,
        })
        .sign(myPrivateKey)
        .execute({ partyId: myParty })
}
