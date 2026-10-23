// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    ApiKeyForm as ApiKeyFormElement,
    type ApiKeyGenerateEvent,
} from '../components/api-key-form.js'

export const ApiKeyForm = createComponent({
    tagName: 'api-key-form',
    elementClass: ApiKeyFormElement,
    react: React,
    events: {
        onApiKeyGenerate: 'api-key-generate' as EventName<ApiKeyGenerateEvent>,
    },
})
