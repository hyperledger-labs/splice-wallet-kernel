import { createKeyPair, signTransactionHash } from '@splice/core-signing-lib'
import { v4 } from 'uuid'
import {
    localAuthDefault,
    localLedgerDefault,
    localTopologyDefault,
    WalletSDKImpl,
} from '@splice/sdk-wallet'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localAuthDefault,
    ledgerFactory: localLedgerDefault,
    topologyFactory: localTopologyDefault,
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
    keyPair.publicKey,
    v4()
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
    console.log('Signed the hash for partyId: ' + preparedParty.partyId)

    await sdk.topology
        ?.submitExternalPartyTopology(signedHash, preparedParty)
        .then((allocatedParty) => {
            console.log('Alocated party ', allocatedParty.partyId)
        })
} else {
    console.error('Error creating prepared party.')
}

console.log('Create ping command')
const createPingCommand = [
    {
        CreateCommand: {
            templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
            createArguments: {
                id: v4(),
                initiator: preparedParty!.partyId!,
                responder: preparedParty!.partyId!,
            },
        },
    },
]

sdk.userLedger?.setPartyId(preparedParty!.partyId!)

const commandId = v4()

console.log('Prepare command submission for ping create command')
const prepareResponse = await sdk.userLedger?.prepareSubmission(
    createPingCommand,
    v4()
)

console.log('Sign transaction hash')

const signedCommandHash = signTransactionHash(
    prepareResponse!.preparedTransactionHash!,
    keyPair.privateKey
)

console.log('Submit command')

sdk.userLedger?.executeSubmission(
    prepareResponse!,
    signedCommandHash,
    keyPair.publicKey,
    commandId
)
