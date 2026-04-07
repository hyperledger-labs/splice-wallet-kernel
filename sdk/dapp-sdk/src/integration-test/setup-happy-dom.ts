// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { EventSource as EventSourceImpl } from 'eventsource'

if (typeof globalThis.EventSource === 'undefined') {
    globalThis.EventSource = EventSourceImpl as typeof globalThis.EventSource
}
