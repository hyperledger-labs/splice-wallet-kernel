import UserApiClient, { Network } from 'core-wallet-user-rpc-client'

export async function addSession(
    userClient: UserApiClient,
    selectedNetwork: Network
) {
    const sessions = await userClient.request('listSessions')

    if (
        !sessions.sessions.some(
            (s) => s.network.chainId == selectedNetwork.chainId
        )
    ) {
        const params = {
            chainId: selectedNetwork.chainId,
        }

        await userClient.request('addSession', params)
    }
}
