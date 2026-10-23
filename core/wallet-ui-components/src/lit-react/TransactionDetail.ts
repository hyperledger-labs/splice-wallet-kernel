// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgTransactionDetail as WgTransactionDetailElement,
    type TransactionApproveEvent,
    type TransactionDeleteEvent,
} from '../components/transaction-detail.js'

export const TransactionDetail = createComponent({
    tagName: 'wg-transaction-detail',
    elementClass: WgTransactionDetailElement,
    react: React,
    events: {
        onTransactionApprove:
            'transaction-approve' as EventName<TransactionApproveEvent>,
        onTransactionDelete:
            'transaction-delete' as EventName<TransactionDeleteEvent>,
    },
})
