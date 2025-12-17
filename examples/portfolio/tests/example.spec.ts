// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test'

test('portfolio: view holdings', async ({ page: dappPage }) => {
    await dappPage.goto('http://localhost:8081/')

    // Expect a title "to contain" a substring.
    await expect(dappPage).toHaveTitle(/dApp Portfolio/)
})
