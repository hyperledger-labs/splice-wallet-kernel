// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import packageJson from '../package.json' with { type: 'json' }
import { SDK_VERSION } from './version.js'

describe('SDK version', () => {
    it('matches package.json and is installed on the page', () => {
        expect(SDK_VERSION).toBe(packageJson.version)
        expect(globalThis.__CANTON_DAPP_SDK__).toEqual({
            name: '@canton-network/dapp-sdk',
            version: packageJson.version,
        })
    })
})
