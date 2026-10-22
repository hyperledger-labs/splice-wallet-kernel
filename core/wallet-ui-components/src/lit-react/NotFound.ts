// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent } from '@lit/react'
import { NotFound as NotFoundElement } from '../components/not-found.js'

export const NotFound = createComponent({
    tagName: 'not-found',
    elementClass: NotFoundElement,
    react: React,
})
