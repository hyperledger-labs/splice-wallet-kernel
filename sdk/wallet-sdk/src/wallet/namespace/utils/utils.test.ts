// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, expect } from 'vitest'
import { parseAssets, ParsedURL } from './url.js'
import type { SDKContext } from '../../init/types/context.js'
import { SDKLogger } from '../../logger/index.js'
import { SDKError, SDKErrorHandler } from '../../error/index.js'
import { SDKUtilsNamespace } from './index.js'
import { capabilities } from '../../__tests__/mocks'

const makeProvider = (overrides: Record<string, unknown> = {}) => ({
    request: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    ...overrides,
})

const ctx: SDKContext = {
    ledgerProvider: makeProvider(),
    userId: 'ledger-api-user',
    logger: new SDKLogger('console'),
    error: new SDKErrorHandler(new SDKLogger('console')),
    defaultSynchronizerId: 'synchronizerId',
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

const pingTx =
    'CoQGCgMyLjESATAa1QUKATDCPs4FCssFCgMyLjESQjAwODM2ZmE0NzAxNmQ4OWJmZWRlNjM5NzlhZDA0OTJkZWI3OGQ5Yzc4MDYzNWNiNDhlMTdhYWE5YjRlNGE2OTczOBoiY2FudG9uLWJ1aWx0aW4tYWRtaW4td29ya2Zsb3ctcGluZyJeCkBkZTJjYzJmOTBlYjUyMzQxNGZmNTRlODk5OTUxZGFkZDg3ODlhNGMwN2UwZjcxZjZkNmM5ZWFmNTdkNDEyYTU0EhRDYW50b24uSW50ZXJuYWwuUGluZxoEUGluZyrVAnLSAgpeCkBkZTJjYzJmOTBlYjUyMzQxNGZmNTRlODk5OTUxZGFkZDg3ODlhNGMwN2UwZjcxZjZkNmM5ZWFmNTdkNDEyYTU0EhRDYW50b24uSW50ZXJuYWwuUGluZxoEUGluZxIsCgJpZBImQiQwNGQ4ODdkZC0xNWI4LTQ5NTQtOGI3OS1hODUzODExY2U3Y2YSYAoJaW5pdGlhdG9yElM6UXYxLTAxLWFsaWNlOjoxMjIwZWUyNjI0MTkwODM0ZGRkZjI4ZjE5NDY4NWFjZWU4ZjAwY2JkZTllZTBkMjExZGFlMjc3ZjRkNzk5ODg0ZjI4ORJgCglyZXNwb25kZXISUzpRdjEtMDEtYWxpY2U6OjEyMjBlZTI2MjQxOTA4MzRkZGRmMjhmMTk0Njg1YWNlZThmMDBjYmRlOWVlMGQyMTFkYWUyNzdmNGQ3OTk4ODRmMjg5MlF2MS0wMS1hbGljZTo6MTIyMGVlMjYyNDE5MDgzNGRkZGYyOGYxOTQ2ODVhY2VlOGYwMGNiZGU5ZWUwZDIxMWRhZTI3N2Y0ZDc5OTg4NGYyODk6UXYxLTAxLWFsaWNlOjoxMjIwZWUyNjI0MTkwODM0ZGRkZjI4ZjE5NDY4NWFjZWU4ZjAwY2JkZTllZTBkMjExZGFlMjc3ZjRkNzk5ODg0ZjI4OSIiEiC8zzmuPyGPcD7usKyRMqdiVWlRskpjZ3ZiBoyD9maILhL/ARJ5ClF2MS0wMS1hbGljZTo6MTIyMGVlMjYyNDE5MDgzNGRkZGYyOGYxOTQ2ODVhY2VlOGYwMGNiZGU5ZWUwZDIxMWRhZTI3N2Y0ZDc5OTg4NGYyODkSJDUxMjFkMTIwLTNjNTMtNDEwMy04NmFhLTdhM2VhNjZlYzQ2NRpTZ2xvYmFsLWRvbWFpbjo6MTIyMGI5NTM5MWNkMDNlMTE4NzFkNTRlOTBjMjAyNTc1ZDI5ZTc2YzI2NWRkMzg4YjhhZmIwNWFhZDU0ZDY3MGRmYzYqJDhiOTBhNDQ4LTFmZmEtNDA0OS04NTNlLWY4YjRmZTg1M2RjMjCwqJjB5v+UAw=='
const topologyTx = [
    'CvEBCAEQARrqAUrnAQpPdjEtMDEtYm9iOjoxMjIwMjdlYjczZGRiODBhYTY0MWE2ZDQwZjhjY2I2MWU0MzIyMjFjZjdlZTI3NTJlMzAxZGIzMWMxYzZmMGRhZGYzNRABGlUKUXBhcnRpY2lwYW50OjoxMjIwOWIxZDBkZDhiMjVlMjAwMmE0NTJiOTlkNGJjMGRlZmVhZDY0ZmQ3YTkyNWEzY2I1MGM3MDJhMDYxNTQyNzVhZBACMjsKNxAEGiwwKjAFBgMrZXADIQCQesJGtB8HQ/zNPGhX6gG/fnapj7qC1nSAoXEMIWR3mCoDAQUEMAEQARAe',
]

const isBrowserEnv = typeof process === 'undefined'
describe('utils package', () => {
    it('tests ParsedURL with string input', () => {
        const urlAsString = 'http://registry.com/path'
        const parsedUrlAsString = new ParsedURL(ctx, urlAsString)
        expect(parsedUrlAsString.href).toBe('http://registry.com/path')
        expect(parsedUrlAsString).toBeInstanceOf(URL)
    })

    it('tests ParsedURL with URL input', () => {
        const urlAsString = new URL('http://registry.com/path')
        const parsedUrlAsString = new ParsedURL(ctx, urlAsString)
        expect(parsedUrlAsString.href).toBe('http://registry.com/path')
        expect(parsedUrlAsString).toBeInstanceOf(URL)
    })

    it('tests ParsedURL with bad input', () => {
        const urlAsString = 'registry.com'

        let thrownError
        try {
            new ParsedURL(ctx, urlAsString)
        } catch (e) {
            thrownError = e as SDKError
        }

        expect(thrownError).toBeDefined()
        expect(thrownError).toBeInstanceOf(SDKError)
        if (thrownError) {
            const err = thrownError as SDKError
            expect(err.context.type).toBe('BadRequest')
            expect(err.context.message).toBe(
                'Invalid URL provided registry.com.'
            )
        }
    })

    it('parses assets with valid registry urls', () => {
        const assets = [amuletAsset, testAsset]
        const result = parseAssets(ctx, assets)
        expect(result).toHaveLength(2)
        result.forEach((r, i) => {
            expect(r.registryUrl).toBeInstanceOf(ParsedURL)
            expect(r.registryUrl.href).toBe('http://registry.com/')
            expect(r.id).toBe(assets[i].id)
        })
    })

    it('throws error for bad asset registry url', () => {
        const asset = {
            id: 'test',
            displayName: 'test',
            symbol: 'test',
            // deliberately invalid: registries are external input
            registryUrl: 'reg.com' as unknown as URL,
            admin: 'adminParty:123',
            capabilities,
        }

        expect(() => parseAssets(ctx, [asset])).toThrow()
    })

    it('throws error for asset missing admin party', () => {
        const asset = {
            id: 'test',
            displayName: 'test',
            symbol: 'test',
            registryUrl: new URL('http://registry.com'),
            admin: undefined as unknown as string,
            capabilities,
        }

        let thrownError
        try {
            parseAssets(ctx, [asset])
        } catch (e) {
            thrownError = e as SDKError
        }

        expect(thrownError).toBeDefined()
        expect(thrownError).toBeInstanceOf(SDKError)
        if (thrownError) {
            const err = thrownError as SDKError
            expect(err.context.type).toBe('Unexpected')
            expect(err.context.message).toBe(
                'Registry response for asset "test" is missing the "admin" (DSO) party.'
            )
        }
    })

    it('tests ping service', () => {
        const utils = new SDKUtilsNamespace({
            logger: new SDKLogger('console'),
            error: new SDKErrorHandler(new SDKLogger('console')),
        })

        const ping = utils.ping.create([
            {
                initiator: 'alice::abc',
                responder: 'bob::def',
                id: 'c5977c20-5078-46b0-ad3d-eef9b27ec981',
            },
        ])

        expect(ping).toStrictEqual([
            {
                CreateCommand: {
                    createArguments: {
                        id: 'c5977c20-5078-46b0-ad3d-eef9b27ec981',
                        initiator: 'alice::abc',
                        responder: 'bob::def',
                    },
                    templateId:
                        '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                },
            },
        ])
    })

    it.skipIf(isBrowserEnv)('tests hash service', async () => {
        const utils = new SDKUtilsNamespace({
            logger: new SDKLogger('console'),
            error: new SDKErrorHandler(new SDKLogger('console')),
        })

        const preparedTxHash = (
            await utils.hash.preparedTransaction(pingTx)
        ).toBase64()
        const topologyHash = await utils.hash.topologyTransaction(topologyTx)
        expect(topologyHash).toBe(
            'EiAuQ/LV6dYD1fIWldav2upEt/c9Wc0k3KbACxMMEBA5lw=='
        )
        expect(preparedTxHash).toBe(
            'Bp2sK8iqD+0g0Qh9cgmPf0Kl7XtJs710fySuuzs3LcI='
        )
    })
})
