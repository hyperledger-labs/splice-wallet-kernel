// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent } from '@lit/react'
import { WgLoadingState as WgLoadingStateElement } from '../components/loading-state.js'

export const LoadingState = createComponent({
    tagName: 'wg-loading-state',
    elementClass: WgLoadingStateElement,
    react: React,
})
