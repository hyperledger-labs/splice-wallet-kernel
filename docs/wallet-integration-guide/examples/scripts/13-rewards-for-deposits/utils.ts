import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import { Token } from '@canton-network/wallet-sdk'

export const partiesUtxos = async (args: {
    token: Token
    sender: GenerateTransactionResponse
    treasury: GenerateTransactionResponse
}) => {
    const { token, sender, treasury } = args
    const senderUtxos = (
        await token.utxos.list({
            partyId: sender.partyId,
        })
    ).reduce((acc, utxo) => acc + +utxo.interfaceViewValue.amount, 0)

    const treasuryUtxos = (
        await token.utxos.list({
            partyId: treasury.partyId,
        })
    ).reduce((acc, utxo) => acc + +utxo.interfaceViewValue.amount, 0)

    return {
        senderUtxos: senderUtxos,
        treasuryUtxos: treasuryUtxos,
    }
}
