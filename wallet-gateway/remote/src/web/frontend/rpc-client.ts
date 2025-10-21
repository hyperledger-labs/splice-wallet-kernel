// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HttpTransport } from '@canton-network/core-types'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'

export const createUserClient = (token?: string) => {
    return new UserApiClient(
        new HttpTransport(
            new URL(`${window.location.origin}/api/v0/user`),
            token
        )
    )
}
