// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Poll `fn` until it returns a non-empty array or the deadline is reached.
 *
 * Ledger events propagate asynchronously across participant nodes. On a loaded
 * CI environment the gap between a transaction being committed on one participant
 * and its ACS events becoming visible on another participant can be several
 * seconds. Use this helper instead of a bare array index access whenever a step
 * depends on contracts created in the immediately preceding step on a *different*
 * participant.
 *
 * @param fn       - Async function that returns an array. Retried until non-empty.
 * @param label    - Human-readable description used in the timeout error message.
 * @param timeoutMs - Maximum time to wait in milliseconds (default 30 s).
 * @param intervalMs - Delay between retries in milliseconds (default 500 ms).
 * @returns The first non-empty array returned by `fn`.
 * @throws {Error} When no results appear within `timeoutMs`.
 */
export async function pollUntilNonEmpty<T>(
    fn: () => Promise<T[]>,
    label: string,
    timeoutMs = 30_000,
    intervalMs = 500
): Promise<T[]> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        const result = await fn()
        if (result.length > 0) return result
        await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    }
    throw new Error(
        `Timed out after ${timeoutMs}ms waiting for: ${label}. ` +
            `The contracts may not have propagated to this participant yet.`
    )
}
