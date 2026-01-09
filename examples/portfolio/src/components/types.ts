// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface ActionItem {
    id: string
    tag: string
    type: string
    date: string
    expiry: string
    message: string
    sender: string
    receiver: string
    currentPartyId: string
    instrumentId: { admin: string; id: string }
    amount: string
}
