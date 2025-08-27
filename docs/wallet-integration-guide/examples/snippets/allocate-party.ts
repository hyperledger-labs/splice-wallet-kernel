import {
    WalletSDKImpl,
    TopologyController,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
} from '@splice/wallet-sdk'

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault, // or use your specific configuration
    ledgerFactory: localNetLedgerDefault, // or use your specific configuration
    topologyFactory: localNetTopologyDefault, // or use your specific configuration
})
await sdk.connectTopology()

const { publicKey, privateKey } = TopologyController.createNewKeyPair()
//partyHint is optional but recommended to make it easier to identify the party
const partyHint = 'my-wallet-1'

const allocatedParty = await sdk.topology?.prepareSignAndSubmitExternalParty(
    publicKey,
    partyHint
)
