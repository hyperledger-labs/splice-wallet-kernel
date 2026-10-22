// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgWalletCreateForm as WgWalletCreateFormElement,
    type WalletCreateEvent,
} from '../components/wallet-create-form.js'
import type { SigningProviderChangeEvent } from '../components/wallet-form.js'

export const WalletCreateForm = createComponent({
    tagName: 'wg-wallet-create-form',
    elementClass: WgWalletCreateFormElement,
    react: React,
    events: {
        onWalletCreate: 'wallet-create' as EventName<WalletCreateEvent>,
        onSigningProviderChange:
            'signing-provider-change' as EventName<SigningProviderChangeEvent>,
    },
})
