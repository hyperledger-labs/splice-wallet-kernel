// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    WgLoginForm as WgLoginFormElement,
    type LoginConnectEvent,
    type LoginBackEvent,
} from '../components/login-form.js'

export const LoginForm = createComponent({
    tagName: 'wg-login-form',
    elementClass: WgLoginFormElement,
    react: React,
    events: {
        onLoginConnect: 'login-connect' as EventName<LoginConnectEvent>,
        onLoginBack: 'login-back' as EventName<LoginBackEvent>,
    },
})
