// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent } from '@lit/react'
import { AppLayout as AppLayoutElement } from '../components/app-layout.js'

export const AppLayout = createComponent({
    tagName: 'app-layout',
    elementClass: AppLayoutElement,
    react: React,
})
