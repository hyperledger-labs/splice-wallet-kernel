// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgWalletEditForm as WgWalletEditFormElement,
    type WalletEditEvent,
} from '../components/wallet-edit-form.js'
import type { SigningProviderChangeEvent } from '../components/wallet-form.js'

export const WalletEditForm = createComponent({
    tagName: 'wg-wallet-edit-form',
    elementClass: WgWalletEditFormElement,
    react: React,
    events: {
        onWalletEdit: 'wallet-edit' as EventName<WalletEditEvent>,
        onSigningProviderChange:
            'signing-provider-change' as EventName<SigningProviderChangeEvent>,
    },
})
