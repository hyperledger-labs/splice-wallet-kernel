// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    AppHeader as AppHeaderElement,
    type LogoutEvent,
    type CopyDappApiUrlEvent,
} from '../components/app-header.js'

export const AppHeader = createComponent({
    tagName: 'app-header',
    elementClass: AppHeaderElement,
    react: React,
    events: {
        onLogout: 'logout' as EventName<LogoutEvent>,
        onCopyDappApiUrl: 'copy-dapp-api-url' as EventName<CopyDappApiUrlEvent>,
    },
})
