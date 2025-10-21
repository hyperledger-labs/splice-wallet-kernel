// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface WSSupport {
    extractProtocols: () => string[]
    baseUrl: string
    enabled: () => boolean
    reportError: (error: Error) => void
    reportSuccess: () => void
}

// After a failure, wait at least this long before retrying
// The back-off duration increases with each failure, up to a maximum
const INITIAL_BACKOFF_MS = 1000

/* Maximum back-off duration
 After reaching this, the back-off duration stops increasing
 and remains constant for subsequent failures.

 Will reset to the initial back-off duration after a successful connection.
*/
const MAX_BACKOFF_MS = 10 * 60 * 1000 // 10 minutes

export class WSSupportWithBackOffSwitch implements WSSupport {
    private backOffUntil: number | null = null

    private backOffDurationMs: number = INITIAL_BACKOFF_MS

    constructor(
        public extractProtocols: () => string[],
        public baseUrl: string
    ) {}

    enabled(): boolean {
        if (this.backOffUntil === null) {
            return true
        }
        const now = Date.now()
        if (now >= this.backOffUntil) {
            this.backOffUntil = null
            return true
        }
        return false
    }

    reportError(error: Error): void {
        console.error('WebSocket error reported:', error)
        const now = Date.now()
        if (this.backOffUntil !== null && now - this.backOffUntil < 500) {
            // Already in back-off period, do not extend it
            return
        }
        this.backOffUntil = Date.now() + this.backOffDurationMs
        this.backOffDurationMs = Math.min(
            this.backOffDurationMs * 1.6,
            MAX_BACKOFF_MS
        )
    }

    reportSuccess(): void {
        this.backOffUntil = null
        this.backOffDurationMs = INITIAL_BACKOFF_MS // Reset to initial back-off duration
    }
}
