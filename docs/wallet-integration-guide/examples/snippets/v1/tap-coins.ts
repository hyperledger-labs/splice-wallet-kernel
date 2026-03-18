import { sdkSetup } from './setupTests'

export default async function () {
    const sdk = await sdkSetup()

    const [amuletTapCommand, amuletTapDisclosedContracts] =
        await sdk.amulet.tap(global.EXISTING_PARTY_1.partyId, '2000000')

    return sdk.ledger
        .prepare({
            partyId: global.EXISTING_PARTY_1.partyId,
            commands: amuletTapCommand,
            disclosedContracts: amuletTapDisclosedContracts,
        })
        .sign(global.EXISTING_PARTY_1_KEYS.privateKey)
        .execute({ partyId: global.EXISTING_PARTY_1.partyId })
}
