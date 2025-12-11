// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { openKernelUserUI } from '../provider'
import * as storage from '../storage'

export async function open(): Promise<void> {
    const discovery = storage.getKernelDiscovery()
    if (!discovery) {
        throw new Error('No previous discovery found')
    }

    const session = storage.getKernelSession()
    if (!session) {
        throw new Error('No previous session found')
    }

    openKernelUserUI(discovery.walletType, session.userUrl ?? '')
}
