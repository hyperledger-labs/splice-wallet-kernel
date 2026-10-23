// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    FormInput as FormInputElement,
    type FormInputChangedEvent,
} from '../components/form-input.js'

export const FormInput = createComponent({
    tagName: 'form-input',
    elementClass: FormInputElement,
    react: React,
    events: {
        onFormInputChange:
            'form-input-change' as EventName<FormInputChangedEvent>,
    },
})
