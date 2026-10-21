// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const POLL_TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 500

/**
 * Calls `read` until it returns a value. Needed when reading on another
 * participant than the one that submitted the transaction: `execute()` only
 * waits for the submitting participant (cross-participant read-after-write).
 */
export async function pollUntilFound<T>(
    read: () => Promise<T | undefined>,
    notFound: string
): Promise<T> {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    for (;;) {
        const value = await read()
        if (value !== undefined) return value
        if (Date.now() >= deadline) throw new Error(notFound)
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
}
