// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgErrorPage as WgErrorPageElement,
    type ErrorPageBackEvent,
    type ErrorPageRefreshEvent,
} from '../components/error-page.js'

export const ErrorPage = createComponent({
    tagName: 'wg-error-page',
    elementClass: WgErrorPageElement,
    react: React,
    events: {
        onErrorBack: 'error-back' as EventName<ErrorPageBackEvent>,
        onErrorRefresh: 'error-refresh' as EventName<ErrorPageRefreshEvent>,
    },
})
