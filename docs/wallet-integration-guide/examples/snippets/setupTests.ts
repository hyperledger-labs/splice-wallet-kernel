import { PartyId } from '@canton-network/core-types'
import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

declare global {
    var EXISTING_PARTY_1: PartyId
    var EXISTING_PARTY_1_KEYS: { publicKey: string; privateKey: string }

    var EXISTING_PARTY_2: PartyId
    var EXISTING_PARTY_2_KEYS: { publicKey: string; privateKey: string }

    var EXISTING_PARTY_WITH_PREAPPROVAL: PartyId
    var EXISTING_PARTY_WITH_PREAPPROVAL_KEYS: {
        publicKey: string
        privateKey: string
    }

    var INSTRUMENT_ADMIN_PARTY: PartyId

    var VALIDATOR_OPERATOR_PARTY: PartyId

    var EXISTING_TOPOLOGY: {
        multiHash: string
        partyId: string
        publicKeyFingerprint: string
        topologyTransactions?: string[]
    }

    var PREPARED_COMMAND: unknown
    var PREPARED_TRANSACTION: {
        preparedTransaction?: string
        preparedTransactionHash: string
        hashingSchemeVersion: string
        hashingDetails?: string
    }
}

// @disable-snapshot-test
async function beforeEachSetup() {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })
    await sdk.connect()
    await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
    sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    // ========= Setup Existing Party 1 =========
    global.EXISTING_PARTY_1_KEYS = createKeyPair()
    global.EXISTING_PARTY_1 =
        (await sdk.userLedger!.signAndAllocateExternalParty(
            global.EXISTING_PARTY_1_KEYS.privateKey
        ))!.partyId

    // ========= Setup Existing Party 2 =========
    global.EXISTING_PARTY_2_KEYS = createKeyPair()
    global.EXISTING_PARTY_2 =
        (await sdk.userLedger!.signAndAllocateExternalParty(
            global.EXISTING_PARTY_2_KEYS.privateKey
        ))!.partyId

    // ========= Setup Prepared Command =========
    {
        await sdk.setPartyId(global.EXISTING_PARTY_1)
        global.PREPARED_COMMAND = sdk.userLedger?.createPingCommand(
            global.EXISTING_PARTY_2
        )
    }
    // ========= Setup Prepared Transaction =========
    {
        global.PREPARED_TRANSACTION = await sdk.userLedger!.prepareSubmission(
            global.PREPARED_COMMAND,
            v4()
        )
    }
    // ========= Setup non-submitted Topology for Existing Party 1 =========
    global.EXISTING_TOPOLOGY = await sdk.userLedger!.generateExternalParty(
        global.EXISTING_PARTY_1_KEYS.publicKey,
        'my-party'
    )
    // ========= Setup Instrument Admin Party =========
    global.INSTRUMENT_ADMIN_PARTY =
        (await sdk.tokenStandard!.getInstrumentAdmin())!
    // ========= Setup Validator Operator Party =========
    global.VALIDATOR_OPERATOR_PARTY = (await sdk.validator!.getValidatorUser())!

    // ========= Setup Existing Party with Preapproval =========
    global.EXISTING_PARTY_WITH_PREAPPROVAL_KEYS = createKeyPair()
    global.EXISTING_PARTY_WITH_PREAPPROVAL =
        (await sdk.userLedger!.signAndAllocateExternalParty(
            global.EXISTING_PARTY_WITH_PREAPPROVAL_KEYS.privateKey
        ))!.partyId

    // ========== SETUP PREAPPROVAL FOR EXISTING PARTY WITH PREAPPROVAL ==========
    {
        await sdk.setPartyId(global.VALIDATOR_OPERATOR_PARTY)
        await sdk.tokenStandard!.createAndSubmitTapInternal(
            global.VALIDATOR_OPERATOR_PARTY,
            '20000000',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: global.INSTRUMENT_ADMIN_PARTY,
            }
        )

        await sdk.setPartyId(global.EXISTING_PARTY_WITH_PREAPPROVAL)

        const transferPreApprovalProposal =
            await sdk.userLedger!.createTransferPreapprovalCommand(
                global.VALIDATOR_OPERATOR_PARTY,
                global.EXISTING_PARTY_WITH_PREAPPROVAL,
                global.INSTRUMENT_ADMIN_PARTY
            )

        await sdk.userLedger!.prepareSignExecuteAndWaitFor(
            [transferPreApprovalProposal],
            global.EXISTING_PARTY_WITH_PREAPPROVAL_KEYS.privateKey,
            v4()
        )
        await sdk.tokenStandard!.waitForPreapprovalFromScanProxy(
            global.EXISTING_PARTY_WITH_PREAPPROVAL,
            'Amulet'
        )
    }

    // ========== SETUP TRANSFER PENDING FROM PARTY 1 TO PARTY 2 ==========
    {
        await sdk.setPartyId(global.EXISTING_PARTY_1)
        const [tapCommand, disclosedContracts] =
            await sdk.tokenStandard!.createTap(
                global.EXISTING_PARTY_1,
                '2000000',
                {
                    instrumentId: 'Amulet',
                    instrumentAdmin: global.INSTRUMENT_ADMIN_PARTY,
                }
            )

        await sdk.userLedger!.prepareSignExecuteAndWaitFor(
            tapCommand,
            global.EXISTING_PARTY_1_KEYS.privateKey,
            v4(),
            disclosedContracts
        )

        const [transferCommand, disclosedContracts2] =
            await sdk.tokenStandard!.createTransfer(
                global.EXISTING_PARTY_1,
                global.EXISTING_PARTY_2,
                '100',
                {
                    instrumentId: 'Amulet',
                    instrumentAdmin: global.INSTRUMENT_ADMIN_PARTY,
                },
                [],
                'memo-ref'
            )

        await sdk.userLedger!.prepareSignExecuteAndWaitFor(
            transferCommand,
            global.EXISTING_PARTY_1_KEYS.privateKey,
            v4(),
            disclosedContracts2
        )
    }
    console.log('Setup complete')
}

beforeAll(async () => {
    await beforeEachSetup()
}, 60_000)
