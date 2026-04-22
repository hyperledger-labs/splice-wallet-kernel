import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import { PartyId } from '@canton-network/core-types'
import { SDKInterface, TokenNamespace } from '@canton-network/wallet-sdk'

export const partiesUtxos = async (args: {
    token: TokenNamespace
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

export async function activeContractsForDelegateTreasuryProxy(
    partyId: PartyId,
    sdk: SDKInterface
): Promise<string> {
    let proxyCid
    const deadline = Date.now() + 30_000
    while (!proxyCid && Date.now() < deadline) {
        const list = await sdk.ledger.acs.read({
            parties: [partyId],
            templateIds: [
                '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
            ],
            filterByParty: true,
        })
        proxyCid = list[0]?.contractId
        if (!proxyCid) await new Promise((r) => setTimeout(r, 5000))
    }

    if (!proxyCid)
        throw new Error('DelegateProxy contract not found after timeout')
    else return proxyCid
}
