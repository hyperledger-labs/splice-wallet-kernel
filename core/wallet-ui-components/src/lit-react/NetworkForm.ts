// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    NetworkForm as NetworkFormElement,
    type NetworkEditCancelEvent,
    type NetworkEditSaveEvent,
    type NetworkDeleteEvent,
} from '../components/network-form.js'

export const NetworkForm = createComponent({
    tagName: 'network-form',
    elementClass: NetworkFormElement,
    react: React,
    events: {
        onNetworkEditCancel:
            'network-edit-cancel' as EventName<NetworkEditCancelEvent>,
        onNetworkEditSave:
            'network-edit-save' as EventName<NetworkEditSaveEvent>,
        onNetworkDelete: 'network-delete' as EventName<NetworkDeleteEvent>,
    },
})
