// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    AuthEditor as AuthEditorElement,
    type AuthEditorChangeEvent,
} from '../components/auth-editor.js'

export const AuthEditor = createComponent({
    tagName: 'auth-editor',
    elementClass: AuthEditorElement,
    react: React,
    events: {
        onAuthChange: 'auth-change' as EventName<AuthEditorChangeEvent>,
    },
})
