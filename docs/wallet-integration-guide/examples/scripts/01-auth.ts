import { v4 } from 'uuid'
import {
    localAuthDefault,
    localLedgerDefault,
    localTopologyDefault,
    WalletSDKImpl,
    createKeyPair,
    signTransactionHash,
    localTokenStandardDefault,
} from '@canton-network/wallet-sdk'

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: () => localAuthDefault(console),
    ledgerFactory: localLedgerDefault,
    topologyFactory: localTopologyDefault,
    tokenStandardFactory: localTokenStandardDefault,
})

const fixedLocalNetSynchronizer =
    'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd'

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

await sdk.connectTopology(fixedLocalNetSynchronizer)
console.log('Connected to topology')

console.log('10 secs timeout...')
await new Promise((resolve) => setTimeout(resolve, 10_000))
console.log('lets start')

const keyPair = createKeyPair()

console.log('generated keypair')
const preparedParty = await sdk.topology?.prepareExternalPartyTopology(
    keyPair.publicKey
)

console.log('Prepared external topology')

if (preparedParty) {
    console.log('Signing the hash')

    const signedHash = signTransactionHash(
        preparedParty?.combinedHash,
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
const createPingCommand = await sdk.userLedger?.createPingCommand(
    preparedParty!.partyId!
)

sdk.setPartyId(preparedParty!.partyId!)

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
