// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'

// TODO: multiple URLs per party.
export type Registries = Map<PartyId, string>

export const loadRegistries = (): Registries => {
    const value = window.localStorage.getItem('registries')
    return value ? new Map(Object.entries(JSON.parse(value))) : new Map()
}

export const storeRegistries = (r: Registries): void => {
    window.localStorage.setItem(
        'registries',
        JSON.stringify(Object.fromEntries(r))
    )
}
