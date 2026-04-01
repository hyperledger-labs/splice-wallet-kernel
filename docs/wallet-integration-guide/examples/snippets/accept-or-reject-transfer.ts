import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const myParty = global.EXISTING_PARTY_2
    const myPrivateKey = global.EXISTING_PARTY_2_KEYS.privateKey
    const Reject = true
    const token = await sdk.token(global.TOKEN_NAMESPACE_CONFIG)

    const myPendingTransaction = await token.transfer.pending(myParty)

    const myPendingTransactionCid = myPendingTransaction[0].contractId
    if (Reject) {
        //reject the transaction
        const [rejectTransferCommand, disclosedContracts] =
            await token.transfer.reject({
                transferInstructionCid: myPendingTransactionCid,
                registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
            })

        await sdk.ledger
            .prepare({
                partyId: myParty,
                commands: rejectTransferCommand,
                disclosedContracts: disclosedContracts,
            })
            .sign(myPrivateKey)
            .execute({ partyId: myParty })
    } else {
        //accept the transaction
        const [acceptTransferCommand, disclosedContracts] =
            await token.transfer.accept({
                transferInstructionCid: myPendingTransactionCid,
                registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
            })

        await sdk.ledger
            .prepare({
                partyId: myParty,
                commands: acceptTransferCommand,
                disclosedContracts: disclosedContracts,
            })
            .sign(myPrivateKey)
            .execute({ partyId: myParty })
    }
}
