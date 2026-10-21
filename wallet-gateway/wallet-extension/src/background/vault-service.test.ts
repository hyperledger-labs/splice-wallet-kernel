// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { isTrustedSender } from './vault-service'

describe('isTrustedSender', () => {
    const id = 'test-extension-id'

    it.each([
        {
            sender: 'the popup',
            url: `chrome-extension://${id}/popup.html`,
            trusted: true,
        },
        {
            sender: 'the app page',
            url: `chrome-extension://${id}/app.html?x=1#/unlock`,
            trusted: true,
        },
        {
            sender: 'a content script on a dApp page',
            url: 'https://dapp.example/popup.html',
            trusted: false,
        },
    ])('$sender → $trusted', ({ url, trusted }) => {
        expect(isTrustedSender({ id, url })).toBe(trusted)
    })
})
