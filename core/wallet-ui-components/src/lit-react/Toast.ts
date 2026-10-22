// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent } from '@lit/react'
import { Toast as ToastElement } from '../components/custom-toast.js'

export const Toast = createComponent({
    tagName: 'custom-toast',
    elementClass: ToastElement,
    react: React,
})
