import { HttpTransport } from '@hyperledger-labs/core-types'

import UserApiClient from '@splice/core-wallet-user-rpc-client'
import { config } from './config'
import { stateManager } from './state-manager'

export const userClient = new UserApiClient(
    new HttpTransport(
        new URL(config.userRpcUri),
        stateManager.accessToken.get()
    )
)
