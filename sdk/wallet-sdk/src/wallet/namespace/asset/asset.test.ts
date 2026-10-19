// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { type AssetContext, AssetNamespace } from './index.js'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { SDKErrorHandler } from '../../error/handler.js'
import { SDKLogger } from '../../logger/logger'
import { capabilities, ctx } from '../../__tests__/mocks'

const makeProvider = (overrides: Record<string, unknown> = {}) => ({
    request: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    ...overrides,
})

const accessTokenProvider = {
    getAccessToken: vi.fn().mockResolvedValue('test-token'),
    getAuthContext: vi.fn().mockResolvedValue(''),
}

const amuletAsset = {
    id: 'Amulet',
    displayName: 'Amulet',
    symbol: 'CC',
    registryUrl: new URL('http://registry.com'),
    admin: 'adminParty:123',
    capabilities,
}

const testAsset = {
    id: 'test',
    displayName: 'test',
    symbol: 'test',
    registryUrl: new URL('http://registry.com'),
    admin: 'adminParty:123',
    capabilities,
}

const testAsset2 = {
    id: 'test',
    displayName: 'test',
    symbol: 'test',
    registryUrl: new URL('http://registry2.com'),
    admin: 'adminParty:123',
    capabilities,
}

function makeAssetNamespace() {
    const provider = makeProvider()

    const service = new TokenStandardService(
        provider,
        accessTokenProvider,
        false
    )

    const assetContext: AssetContext = {
        tokenStandardService: service,
        registries: [new URL('http://registry.com')],
        error: new SDKErrorHandler(new SDKLogger('console')),
        list: [amuletAsset, testAsset, testAsset2],
        commonCtx: ctx,
    }

    const asset = new AssetNamespace(assetContext)

    return { asset, assetContext }
}

describe('Asset namespace', () => {
    it('should list assets', () => {
        const { asset } = makeAssetNamespace()
        const listedAsset = asset.list

        expect(listedAsset).toHaveLength(3)
        expect(listedAsset[0]).toEqual(amuletAsset)
    })

    it('should find asset by ID', async () => {
        const { asset } = makeAssetNamespace()

        const foundAsset = await asset.find('Amulet')
        expect(foundAsset).toEqual(amuletAsset)
    })

    it('should throw an error if asset is not found within asset list', async () => {
        const { asset } = makeAssetNamespace()
        await expect(() => asset.find('bad-id')).rejects.toThrow(
            'Asset with id bad-id not found'
        )
    })

    it('should throw an error if multiple assets are found and suggest to provide a registryURL', async () => {
        const { asset } = makeAssetNamespace()
        await expect(() => asset.find('test')).rejects.toThrow(
            'Multiple assets found, please provide a registryUrl'
        )
    })

    it('should find an asset by registryURL and id', async () => {
        const { asset } = makeAssetNamespace()
        const foundAsset = await asset.find(
            'test',
            new URL('http://registry2.com')
        )

        expect(foundAsset).toEqual(testAsset2)
        expect(foundAsset).not.toEqual(testAsset)
    })
})
