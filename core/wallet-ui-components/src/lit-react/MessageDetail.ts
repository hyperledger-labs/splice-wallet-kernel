// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgMessageDetail as WgMessageDetailElement,
    type MessageApproveEvent,
    type MessageDeleteEvent,
} from '../components/message-detail.js'

export const MessageDetail = createComponent({
    tagName: 'wg-message-detail',
    elementClass: WgMessageDetailElement,
    react: React,
    events: {
        onMessageApprove: 'message-approve' as EventName<MessageApproveEvent>,
        onMessageDelete: 'message-delete' as EventName<MessageDeleteEvent>,
    },
})
