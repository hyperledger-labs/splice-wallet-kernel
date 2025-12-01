// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as storage from './storage.js'
import { onStatusChanged } from './provider/events.js'

if (window.canton) {
    // Clean up session on disconnect
    onStatusChanged(async (event) => {
        if (!event.isConnected) {
            storage.removeKernelSession()
        }
    })
}
