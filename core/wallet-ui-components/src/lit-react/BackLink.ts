// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent } from '@lit/react'
import { WgBackLink as WgBackLinkElement } from '../components/back-link.js'

export const BackLink = createComponent({
    tagName: 'wg-back-link',
    elementClass: WgBackLinkElement,
    react: React,
})
