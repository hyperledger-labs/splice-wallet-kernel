import { WalletSDK } from '@canton-network/wallet-sdk'
import { KeyPair } from '@canton-network/core-signing-lib'
import { PartyId } from '@canton-network/core-types'
import { v4 } from 'uuid'
import { pino } from 'pino'

export async function tapDevNetFaucet(
    sdk: WalletSDK,
    party: PartyId,
    keyPair: KeyPair,
    amount: Number
) {
    const logger = pino({ name: 'tap-party', level: 'info' })

    const instrumentAdminPartyId =
        (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

    const amuletIdentifier = {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }

    const [tapCommand, tapDisclosedContracts] =
        await sdk.tokenStandard!.createTap(
            party,
            amount.toString(),
            amuletIdentifier
        )

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        tapCommand,
        keyPair.privateKey,
        v4(),
        tapDisclosedContracts
    )

    logger.info(`Tapped for ${party} for ${amount} Amulet`)
}
