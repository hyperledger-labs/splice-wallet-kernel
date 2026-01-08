// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { onStatusChanged } from './provider/events.js'
import { clearAllLocalState } from './util.js'

if (window.canton) {
    // Clean up session on disconnect
    onStatusChanged(async (event) => {
        if (!event.isConnected) {
            clearAllLocalState()
        }
    })
}
