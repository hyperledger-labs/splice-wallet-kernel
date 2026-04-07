import { RewardsForDepositsTestScriptParameters } from './types.js'

export default async (args: RewardsForDepositsTestScriptParameters) => {
    const { sdk, logger, sender, treasury, treasuryKeys, token, commandArgs } =
        args

    const { proxyCid, transferInstructionCid, featuredAppRight } = commandArgs

    const [
        acceptTransferInstructionProxyCommand,
        acceptTransferInstructionProxyDisclosedContracts,
    ] = await token.transfer.delegatedProxy.commands.accept({
        proxyCid,
        transferInstructionCid,
        featuredAppRight,
    })

    await sdk.ledger
        .prepare({
            partyId: treasury.partyId,
            commands: acceptTransferInstructionProxyCommand,
            disclosedContracts:
                acceptTransferInstructionProxyDisclosedContracts,
        })
        .sign(treasuryKeys.privateKey)
        .execute({
            partyId: treasury.partyId,
        })

    logger.info('Successfully accepted transfer instruction through proxy')

    const aliceUtxos = (
        await token.utxos.list({
            partyId: sender.partyId,
        })
    ).reduce((acc, utxo) => acc + +utxo.interfaceViewValue.amount, 0)

    const treasuryUtxos = (
        await token.utxos.list({
            partyId: treasury.partyId,
        })
    ).reduce((acc, utxo) => acc + +utxo.interfaceViewValue.amount, 0)

    logger.info({
        aliceUtxos,
        treasuryUtxos,
    })

    if (aliceUtxos !== 19999900 || treasuryUtxos !== 100)
        throw Error('Incorrect utxos values set')
}
