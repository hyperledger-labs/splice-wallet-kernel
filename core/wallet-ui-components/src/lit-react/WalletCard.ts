// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgWalletCard as WgWalletCardElement,
    type WalletSetPrimaryEvent,
    type WalletCardEditEvent,
    type WalletAllocateEvent,
    type WalletCardSelectEvent,
} from '../components/wallet-card.js'

export const WalletCard = createComponent({
    tagName: 'wg-wallet-card',
    elementClass: WgWalletCardElement,
    react: React,
    events: {
        onWalletSetPrimary:
            'wallet-set-primary' as EventName<WalletSetPrimaryEvent>,
        onWalletEdit: 'wallet-edit' as EventName<WalletCardEditEvent>,
        onWalletAllocate: 'wallet-allocate' as EventName<WalletAllocateEvent>,
        onWalletSelect: 'wallet-select' as EventName<WalletCardSelectEvent>,
    },
})
