import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    signTransactionHash,
} from '@splice/wallet-sdk'
import { v4 } from 'uuid'

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

console.log('SDK initialized')

await sdk.connect()
console.log('Connected to ledger')

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        console.log('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

await sdk.connectAdmin()
console.log('Connected to admin ledger')

await sdk.adminLedger
    ?.listWallets()
    .then((wallets) => {
        console.log('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

await sdk.connectTopology()
console.log('Connected to topology')

const keyPair = createKeyPair()

console.log('generated keypair')
const preparedParty = await sdk.topology?.prepareExternalPartyTopology(
    keyPair.publicKey
)

console.log('Prepared external topology')

if (preparedParty) {
    console.log('Signing the hash')
    const base64StringCombinedHash = Buffer.from(
        preparedParty?.combinedHash,
        'hex'
    ).toString('base64')

    const signedHash = signTransactionHash(
        base64StringCombinedHash,
        keyPair.privateKey
    )

    await sdk.topology
        ?.submitExternalPartyTopology(signedHash, preparedParty)
        .then((allocatedParty) => {
            console.log('Alocated party ', allocatedParty.partyId)
        })
} else {
    console.error('Error creating prepared party.')
}

console.log('Create ping command')
const createPingCommand = sdk.topology?.createPingCommand(
    preparedParty!.partyId!
)

sdk.adminLedger?.setPartyId(preparedParty!.partyId!)

console.log('Prepare command submission for ping create command')
const prepareResponse =
    await sdk.adminLedger?.prepareSubmission(createPingCommand)

console.log('Sign transaction hash')

const signedCommandHash = signTransactionHash(
    prepareResponse!.preparedTransactionHash!,
    keyPair.privateKey
)

console.log('Submit command')

sdk.adminLedger
    ?.executeSubmission(
        prepareResponse!,
        signedCommandHash,
        keyPair.publicKey,
        v4()
    )
    .then((executeSubmissionResponse) => {
        console.log(
            'Executed command submission succeeded',
            executeSubmissionResponse
        )
    })
    .catch((error) =>
        console.error('Failed to submit command with error %d', error)
    )

console.log('List Token Standard Holding Transactions')
await sdk.tokenStandard
    ?.listHoldingTransactions()
    .then((transactions) => {
        console.log('Token Standard Holding Transactions:', transactions)
    })
    .catch((error) => {
        console.error(
            'Error listing token standard holding transactions:',
            error
        )
    })
