import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    const sender = global.EXISTING_PARTY_1
    const receiver = global.EXISTING_PARTY_2
    const instrumentAdminPartyId = global.INSTRUMENT_ADMIN_PARTY

    await sdk.connect()
    await sdk.setPartyId(sender)
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const [transferCommand, disclosedContracts] =
        await sdk.tokenStandard!.createTransfer(
            sender,
            receiver,
            '100',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [],
            'memo-ref'
        )

    const transaction = await sdk.userLedger?.prepareSubmission(
        transferCommand, //the prepared ping command
        v4(), //a unique deduplication id for this transaction
        disclosedContracts //contracts that needs to be disclosed in our to execute the command
    )
}
