// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { browser } from 'wxt/browser'

/** Runs in the service worker. Registers background services. */
export function startBackground() {
    // oxlint-disable-next-line no-console -- scaffold stub, replaced when the background is ported
    console.log('Hello background!', { id: browser.runtime.id })
}
