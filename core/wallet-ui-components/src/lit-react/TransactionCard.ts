// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgTransactionCard as WgTransactionCardElement,
    type TransactionCardReviewEvent,
} from '../components/transaction-card.js'

export const TransactionCard = createComponent({
    tagName: 'wg-transaction-card',
    elementClass: WgTransactionCardElement,
    react: React,
    events: {
        onTransactionReview:
            'transaction-review' as EventName<TransactionCardReviewEvent>,
    },
})
