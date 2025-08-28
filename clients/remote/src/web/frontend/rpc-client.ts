import { HttpTransport } from '@canton-network/core-types'

import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { config } from './config'
import { stateManager } from './state-manager'

export const userClient = new UserApiClient(
    new HttpTransport(
        new URL(config.userRpcUri),
        stateManager.accessToken.get()
    )
)
