import { components, paths } from '../generated-clients/openapi-3.4.0-SNAPSHOT'
import createClient, { Client } from 'openapi-fetch'

export class LedgerClient {
    private readonly client: Client<paths>

    constructor(baseUrl: string) {
        this.client = createClient<paths>({ baseUrl })
    }

    public async getParties(): Promise<string[]> {
        const response = await this.client.GET('/v2/parties')

        if (!response.data) {
            throw new Error(
                response?.error.toString() ||
                    'No data returned from the ledger API'
            )
        }

        const parties =
            response.data.partyDetails?.map(
                (partyDetail) => partyDetail.party
            ) || []

        return parties
    }

    public async allocateParty(
        body: paths['/v2/parties']['post']['requestBody']['content']['application/json']
    ): Promise<{ partyDetails?: components['schemas']['PartyDetails'] }> {
        const { data, error } = await this.client.POST('/v2/parties', {
            body,
        })

        if (!data) {
            throw new Error(
                error?.toString() || 'No data returned from the ledger API'
            )
        }

        return data
    }
}
