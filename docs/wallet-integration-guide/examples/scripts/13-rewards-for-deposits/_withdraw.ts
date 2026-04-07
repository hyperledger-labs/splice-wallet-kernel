import { RewardsForDepositsTestScriptParameters } from './types.js'

export default async (args: RewardsForDepositsTestScriptParameters) => {
    const {
        sdk,
        logger,
        sender,
        treasury,
        senderKeys,
        treasuryKeys,
        token,
        commandArgs,
    } = args

    const childLogger = logger.child({
        withdraw: true,
    })

    const { proxyCid, transferInstructionCid, featuredAppRight } = commandArgs

    const [
        withdrawTransferInstructionProxyCommand,
        withdrawTransferInstructionProxyDisclosedContracts,
    ] = await token.transfer.delegatedProxy.commands.withdraw({
        proxyCid,
        transferInstructionCid,
        featuredAppRight,
    })

    console.log(withdrawTransferInstructionProxyCommand)

    await sdk.ledger
        .prepare({
            partyId: sender.partyId,
            commands: withdrawTransferInstructionProxyCommand,
            disclosedContracts:
                withdrawTransferInstructionProxyDisclosedContracts,
        })
        .sign(senderKeys.privateKey)
        .execute({
            partyId: sender.partyId,
        })

    childLogger.info(
        'Successfully withdrawn transfer instruction through proxy'
    )

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

    childLogger.info({
        aliceUtxos,
        treasuryUtxos,
    })

    // if (aliceUtxos !== 19999900 || treasuryUtxos !== 100)
    //     throw Error('Incorrect utxos values set')
}
