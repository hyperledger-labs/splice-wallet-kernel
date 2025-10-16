// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthContext, UserId } from './auth-service'
import { providerErrors } from '@canton-network/core-rpc-errors'

export function assertConnected(authContext: AuthContext | undefined): UserId {
    if (!authContext) {
        throw providerErrors.unauthorized({
            message: 'User is not connected',
        })
    }
    return authContext.userId
}
