import { RewardsForDepositsTestScriptParameters } from './types.js'
import { partiesUtxos } from './utils.js'

export default async (args: RewardsForDepositsTestScriptParameters) => {
    const { sdk, logger, sender, treasury, treasuryKeys, token, commandArgs } =
        args

    const childLogger = logger.child({
        method: 'accept',
    })

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

    childLogger.info('Successfully accepted transfer instruction through proxy')

    const { senderUtxos, treasuryUtxos } = await partiesUtxos({
        token,
        sender,
        treasury,
    })

    childLogger.info({
        senderUtxos,
        treasuryUtxos,
    })

    if (senderUtxos !== 19999900 || treasuryUtxos !== 100)
        throw Error('Incorrect utxos values set')
}
