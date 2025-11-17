import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@canton-network/wallet-sdk'

const PING_NEW = '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping' // 3.4+
const PING_OLD = '#AdminWorkflows:Canton.Internal.Ping:Ping' // 3.3

function parseMajorMinor(version: string): [number, number] {
    const [major, minor] = version.split('.')
    return [Number(major) || 0, Number(minor) || 0]
}
function greaterOrEqualVersion(a: string, b: string): boolean {
    const [aMajor, aMinor] = parseMajorMinor(a)
    const [bMajor, bMinor] = parseMajorMinor(b)
    return aMajor > bMajor || (aMajor === bMajor && aMinor >= bMinor)
}

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })
    await sdk.connect()

    const myParty = global.EXISTING_PARTY_1
    const offset = (await sdk.userLedger!.ledgerEnd()!).offset
    //we use holdings as an example here
    const version = sdk.userLedger!.getCurrentClientVersion()
    const isNewTemplate = greaterOrEqualVersion(version, '3.4')
    const myTemplateId = isNewTemplate ? PING_NEW : PING_OLD

    await sdk.userLedger!.activeContracts({
        offset,
        parties: [myParty],
        templateIds: [myTemplateId], //this is optional for if you want to filter by template id
        filterByParty: true,
    })
}
