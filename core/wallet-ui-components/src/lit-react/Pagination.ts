// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgPagination as WgPaginationElement,
    type PageChangeEvent,
} from '../components/pagination.js'

export const Pagination = createComponent({
    tagName: 'wg-pagination',
    elementClass: WgPaginationElement,
    react: React,
    events: {
        onPageChange: 'page-change' as EventName<PageChangeEvent>,
    },
})
