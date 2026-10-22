// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent } from '@lit/react'
import { WalletPicker as WalletPickerElement } from '../components/wallet-picker.js'

export const WalletPicker = createComponent({
    tagName: 'swk-wallet-picker',
    elementClass: WalletPickerElement,
    react: React,
})
