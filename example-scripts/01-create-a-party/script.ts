import UserApiClient from 'core-wallet-user-rpc-client'
import { HttpTransport } from '../00-utils/httpTransport'
import { auth } from '../00-utils/auth'

const userClient = new UserApiClient(
    new HttpTransport('http://localhost:3001/rpc')
)

async function createPartyWithWalletKernelSigner() {
    const params = {
        partyHint: 'example-party',
        chainId: 'canton:local-oauth',
        signingProviderId: 'participant',
        primary: true,
    }

    try {
        const result = await userClient.request('createWallet', params)
        console.log('Created party:', result)
    } catch (error) {
        console.error('Failed to create party:', error)
    }
}

auth(userClient).then(() => createPartyWithWalletKernelSigner())
