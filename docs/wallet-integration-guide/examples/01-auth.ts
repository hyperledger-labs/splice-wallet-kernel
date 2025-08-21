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

const createPingCommand = (party: string) => [
    {
        CreateCommand: {
            templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
            createArguments: {
                id: 'my-test',
                initiator: party,
                responder: party,
            },
        },
    },
]

sdk.userLedger?.setPartyId(preparedParty!.partyId!)

const commandId = v4()
const prepareResponse = await sdk.userLedger?.prepareSubmission(
    createPingCommand(preparedParty!.partyId!),
    v4()
)

const signedCommandHash = signTransactionHash(
    prepareResponse!.preparedTransactionHash!,
    keyPair.privateKey
)

sdk.userLedger?.executeSubmission(
    prepareResponse!,
    signedCommandHash,
    keyPair.publicKey,
    commandId
)
