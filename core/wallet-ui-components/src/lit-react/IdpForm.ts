// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { createComponent, type EventName } from '@lit/react'
import {
    IdpFormComponent as IdpFormComponentElement,
    type IdpFormSaveEvent,
    type IdpFormDeleteEvent,
    type IdpFormCancelEvent,
    type IdpFormBackEvent,
} from '../components/idp-form.js'

export const IdpForm = createComponent({
    tagName: 'idp-form',
    elementClass: IdpFormComponentElement,
    react: React,
    events: {
        onIdpFormSave: 'idp-form-save' as EventName<IdpFormSaveEvent>,
        onIdpFormDelete: 'idp-form-delete' as EventName<IdpFormDeleteEvent>,
        onIdpFormCancel: 'idp-form-cancel' as EventName<IdpFormCancelEvent>,
        onIdpFormBack: 'idp-form-back' as EventName<IdpFormBackEvent>,
    },
})
