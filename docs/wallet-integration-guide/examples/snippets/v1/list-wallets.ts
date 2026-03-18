import { sdkSetup } from './setupTests'

export default async function () {
    const sdk = await sdkSetup()

    await sdk.party.list()
}
