import { RewardsForDepositsTestScriptParameters } from './types.js'

export default async (args: RewardsForDepositsTestScriptParameters) => {
    const { sdk, logger, sender, treasury, treasuryKeys, token, commandArgs } =
        args

    const { proxyCid, transferInstructionCid, featuredAppRight } = commandArgs

    const [
        rejectTransferInstructionProxyCommand,
        rejectTransferInstructionProxyDisclosedContracts,
    ] = await token.transfer.delegatedProxy.commands.reject({
        proxyCid,
        transferInstructionCid,
        featuredAppRight,
    })

    await sdk.ledger
        .prepare({
            partyId: treasury.partyId,
            commands: rejectTransferInstructionProxyCommand,
            disclosedContracts:
                rejectTransferInstructionProxyDisclosedContracts,
        })
        .sign(treasuryKeys.privateKey)
        .execute({
            partyId: treasury.partyId,
        })

    logger.info('Successfully rejected transfer instruction through proxy')

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

    if (aliceUtxos !== 20000000 || treasuryUtxos !== 0)
        throw Error('Incorrect utxos values set')
}
