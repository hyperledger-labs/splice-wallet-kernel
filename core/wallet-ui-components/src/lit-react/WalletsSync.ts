// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import { WgWalletsSync as WgWalletsSyncElement } from '../components/wallets-sync.js'

export const WalletsSync = createComponent({
    tagName: 'wg-wallets-sync',
    elementClass: WgWalletsSyncElement,
    react: React,
    events: {
        onSyncSuccess: 'sync-success' as EventName<CustomEvent>,
    },
})
