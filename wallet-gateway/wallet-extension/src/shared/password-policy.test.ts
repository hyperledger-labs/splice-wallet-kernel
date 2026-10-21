// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { passwordProblems } from './password-policy'

describe('passwordProblems', () => {
    it.each([
        ['abc', ['Use at least 6 characters.', 'Include at least 1 digit.']],
        ['abc12', ['Use at least 6 characters.']],
        ['abcdef', ['Include at least 1 digit.']],
        ['abcde1', []],
    ])('checks %j', (password, problems) => {
        expect(passwordProblems(password)).toEqual(problems)
    })
})
