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
    const senderKey = global.EXISTING_PARTY_1_KEYS.privateKey
    const instrumentAdminPartyId = global.INSTRUMENT_ADMIN_PARTY

    const receiver = global.EXISTING_PARTY_2

    await sdk.connect()
    await sdk.setPartyId(sender)
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const [transferCommand, disclosedContracts2] =
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

    //we use the AndWaitFor to get a completion result
    const completionResult = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        transferCommand,
        senderKey,
        v4(),
        disclosedContracts2
    )

    const transaction = await sdk.tokenStandard!.getTransactionById(
        completionResult!.updateId
    )
}
