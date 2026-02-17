// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AccessTokenProvider } from '@canton-network/core-wallet-auth'

export type ParticipantEndpointConfig = {
    url: URL
    accessToken?: string
    accessTokenProvider?: AccessTokenProvider
}
