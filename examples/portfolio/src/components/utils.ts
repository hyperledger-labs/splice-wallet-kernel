// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ActionItem } from './types'

export const isReceiver = (item: ActionItem) => {
    return item.currentPartyId === item.receiver
}

export const getCounterparty = (item: ActionItem) => {
    if (isReceiver(item)) {
        return { label: 'Sender', value: item.sender }
    }
    return { label: 'Receiver', value: item.receiver }
}
