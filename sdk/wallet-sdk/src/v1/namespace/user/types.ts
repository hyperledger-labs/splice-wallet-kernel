// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'

export type UserRights = {
    canReadAsAnyParty?: boolean
    canExecuteAsAnyParty?: boolean
    readAs?: PartyId[]
    actAs?: PartyId[]
    participantAdmin?: boolean
}

export type CreateUserParams = {
    userId: string
    primaryParty: PartyId
    userRights?: UserRights
    idp?: string
}

export type GrantRightsParams = {
    userRights: UserRights
    userId?: string
    idp?: string
}
