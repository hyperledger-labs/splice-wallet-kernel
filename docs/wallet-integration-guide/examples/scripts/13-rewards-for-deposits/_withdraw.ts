import { RewardsForDepositsTestScriptParameters } from './types.js'
import { partiesUtxos } from './utils.js'

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
        method: 'withdraw',
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

    await sdk.ledger
        .prepare({
            partyId: treasury.partyId,
            commands: withdrawTransferInstructionProxyCommand,
            disclosedContracts:
                withdrawTransferInstructionProxyDisclosedContracts,
        })
        .sign(treasuryKeys.privateKey)
        .sign(senderKeys.privateKey)
        .execute({
            partyId: treasury.partyId,
        })

    childLogger.info(
        'Successfully withdrawn transfer instruction through proxy'
    )

    const { senderUtxos, treasuryUtxos } = await partiesUtxos({
        token,
        sender,
        treasury,
    })

    childLogger.info({
        senderUtxos,
        treasuryUtxos,
    })

    // After withdraw, transfer instruction should be gone and UTXOs unchanged
    if (senderUtxos !== 20000000 || treasuryUtxos !== 0)
        throw Error('Incorrect utxos values after withdraw')
}
