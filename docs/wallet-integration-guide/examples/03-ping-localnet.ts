import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    createKeyPair,
} from '@splice/sdk-wallet'
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

console.log('generated keypair')
const allocatedParty = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPair.publicKey
)

console.log('Create ping command')
const createPingCommand = await sdk.userLedger?.createPingCommand(
    allocatedParty!.partyId!
)
sdk.userLedger?.setPartyId(allocatedParty!.partyId!)

console.log('Prepare command submission for ping create command')
const prepareResponse = await sdk.userLedger?.prepareSignAndExecuteTransaction(
    createPingCommand,
    keyPair.privateKey,
    v4()
)
