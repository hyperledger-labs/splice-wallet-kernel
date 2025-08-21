import UserApiClient from '@splice/core-wallet-user-rpc-client'
import { HttpTransport } from './httpTransport'
import { addSession } from './sessionHandler'

export async function auth(userClient: UserApiClient) {
    const http = userClient.transport as HttpTransport
    if (!http.isAuthed) {
        const networks = await userClient.request('listNetworks')
        const selectedNetwork = networks.networks[2]
        const auth = selectedNetwork.auth

        const config = await fetch(auth.configUrl).then((res) => res.json())
        const statePayload = {
            configUrl: auth.configUrl,
            clientId: auth.clientId,
            audience: auth.audience,
        }

        const authParams = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: selectedNetwork.auth.clientId || '',
            client_secret: selectedNetwork.auth.clientSecret || '',
            scope: auth.scope || '',
            audience: auth.audience || '',
            state: btoa(JSON.stringify(statePayload)),
        })

        const response = await fetch(config.token_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: authParams.toString(),
        })

        const json = await response.json()

        await http.useToken(json.access_token)
        await addSession(userClient, selectedNetwork)
    }
}
