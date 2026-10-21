// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Returns what's wrong with a new password, or `[]` when it's acceptable.
 * Applies to new passwords only, never to unlock, so tightening it later
 * can't lock anyone out.
 */
export function passwordProblems(password: string): string[] {
    // TODO: add a real policy for password length, complexity, etc.
    const problems: string[] = []
    // Count code points, not UTF-16 units.
    if ([...password].length < 6) {
        problems.push('Use at least 6 characters.')
    }
    if (!/\d/.test(password)) {
        problems.push('Include at least 1 digit.')
    }
    return problems
}
