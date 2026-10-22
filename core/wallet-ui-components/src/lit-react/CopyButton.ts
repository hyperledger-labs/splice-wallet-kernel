// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgCopyButton as WgCopyButtonElement,
    type CopySuccessEvent,
} from '../components/copy-button.js'

export const CopyButton = createComponent({
    tagName: 'wg-copy-button',
    elementClass: WgCopyButtonElement,
    react: React,
    events: {
        onCopySuccess: 'copy-success' as EventName<CopySuccessEvent>,
    },
})
