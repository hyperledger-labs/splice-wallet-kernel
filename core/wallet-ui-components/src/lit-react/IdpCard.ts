// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    IdpCard as IdpCardElement,
    type IdpCardReviewEvent,
    type IdpCardDeleteEvent,
    type IdpCardUpdateEvent,
} from '../components/idp-card.js'

export const IdpCard = createComponent({
    tagName: 'idp-card',
    elementClass: IdpCardElement,
    react: React,
    events: {
        onIdpReview: 'idp-review' as EventName<IdpCardReviewEvent>,
        onDelete: 'delete' as EventName<IdpCardDeleteEvent>,
        onUpdate: 'update' as EventName<IdpCardUpdateEvent>,
    },
})
