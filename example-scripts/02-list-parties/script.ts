import UserApiClient from 'core-wallet-user-rpc-client'
import { HttpTransport } from '../00-utils/httpTransport'
import { auth } from '../00-utils/auth'

const userClient = new UserApiClient(
    new HttpTransport('http://localhost:3001/rpc')
)

async function listParties() {
    const params = {}

    try {
        const result = await userClient.request('listWallets', params)
        console.log(result)
    } catch (error) {
        console.error('Failed to list parties:', error)
    }
}

auth(userClient).then(() => listParties())
