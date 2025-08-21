import { createKeyPair, signTransactionHash } from '@splice/core-signing-lib'
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
const preparedParty = await sdk.topology?.prepareExternalPartyTopology(
    keyPair.publicKey
)

if (preparedParty) {
    const signedHash = signTransactionHash(
        preparedParty?.combinedHash,
        keyPair.privateKey
    )

    await sdk.topology
        ?.submitExternalPartyTopology(signedHash, preparedParty)
        .then((allocatedParty) =>
            console.log('Alocated party ', allocatedParty.partyId)
        )
} else {
    console.error('Error creating prepared party.')
}
