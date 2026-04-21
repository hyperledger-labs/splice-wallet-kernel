import { RewardsForDepositsTestScriptParameters } from './types.js'

export default async (args: RewardsForDepositsTestScriptParameters) => {
    const {
        sdk,
        logger,
        sender,
        treasury,
        treasuryKeys,
        commandArgs,
        startingAmount,
    } = args

    const childLogger = logger.child({
        method: 'reject',
    })

    const { proxyCid, transferInstructionCid, featuredAppRight } = commandArgs

    const [
        rejectTransferInstructionProxyCommand,
        rejectTransferInstructionProxyDisclosedContracts,
    ] = await sdk.token.transfer.delegatedProxy.commands.reject({
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

    childLogger.info('Successfully rejected transfer instruction through proxy')

    const aliceUtxos = (
        await sdk.token.utxos.list({
            partyId: sender.partyId,
        })
    ).reduce((acc, utxo) => acc + +utxo.interfaceViewValue.amount, 0)

    const treasuryUtxos = (
        await sdk.token.utxos.list({
            partyId: treasury.partyId,
        })
    ).reduce((acc, utxo) => acc + +utxo.interfaceViewValue.amount, 0)

    childLogger.info({
        aliceUtxos,
        treasuryUtxos,
    })

    if (aliceUtxos !== startingAmount || treasuryUtxos !== startingAmount)
        throw Error('Incorrect utxos values set')
}
