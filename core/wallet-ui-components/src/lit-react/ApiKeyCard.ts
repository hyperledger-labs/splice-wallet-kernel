// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    ApiKeyCard as ApiKeyCardElement,
    type ApiKeyCardRevokeEvent,
} from '../components/api-key-card.js'

export const ApiKeyCard = createComponent({
    tagName: 'api-key-card',
    elementClass: ApiKeyCardElement,
    react: React,
    events: {
        onRevoke: 'revoke' as EventName<ApiKeyCardRevokeEvent>,
    },
})
