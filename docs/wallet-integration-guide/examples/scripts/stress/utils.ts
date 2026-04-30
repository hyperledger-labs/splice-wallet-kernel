import { PrivateKey } from '@canton-network/core-signing-lib'
import { PartyId } from '@canton-network/core-types'
import { SDKInterface } from '@canton-network/wallet-sdk'
import { Logger } from 'pino'

export async function batchTap(
    totalTaps: number,
    batchSize: number,
    sdk: SDKInterface<'amulet'>,
    partyId: PartyId,
    privateKey: PrivateKey,
    logger: Logger
) {
    const tapIndices = Array.from({ length: totalTaps })

    for (let i = 0; i < tapIndices.length; i += batchSize) {
        const batch = tapIndices.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize)
        const batchEnd = Math.min(i + batchSize, totalTaps)
        logger.info(
            `Running tap batch  ${batchNumber}:${i + 1}-${batchEnd} of ${totalTaps}`
        )

        const randomAmount = () => Math.floor(Math.random() * 1000) + 1000

        await Promise.all(
            batch.map(async () => {
                const [amuletTapCommand, amuletTapDisclosedContracts] =
                    await sdk.amulet.tap(partyId, randomAmount().toString())

                return sdk.ledger
                    .prepare({
                        partyId: partyId,
                        commands: amuletTapCommand,
                        disclosedContracts: amuletTapDisclosedContracts,
                    })
                    .sign(privateKey)
                    .execute({ partyId: partyId })
            })
        )

        logger.info(`Tap batch ${batchNumber} complete`)
    }
}
