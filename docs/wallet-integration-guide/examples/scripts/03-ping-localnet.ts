import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    LocalNetDefaultScanApi,
    createKeyPair,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
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

const keyPair = createKeyPair()
await sdk.connectTopology(LocalNetDefaultScanApi)

console.log('generated keypair')
const allocatedParty = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPair.privateKey
)
sdk.userLedger?.setPartyId(allocatedParty!.partyId)
console.log('Create ping command')
const createPingCommand = sdk.userLedger?.createPingCommand(
    allocatedParty!.partyId!
)
sdk.userLedger?.setPartyId(allocatedParty!.partyId!)

console.log('Prepare command submission for ping create command')
const prepareResponse = await sdk.userLedger?.prepareSignAndExecuteTransaction(
    createPingCommand,
    keyPair.privateKey,
    v4()
)
