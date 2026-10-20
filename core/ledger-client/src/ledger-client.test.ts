// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { reset } from '@logtape/logtape'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    createAccessTokenProvider,
    createLedgerClient,
    getRequestHeaders,
    getRequestMethod,
    grpcError,
    jsonResponse,
    initializeLogRecorder,
} from './__tests__/test-utils.js'
import { isValidGetEndpoint, isValidPostEndpoint } from './ledger-client.js'

function versionResponse(version = '3.5.0') {
    return jsonResponse({ version })
}

let recorder: Awaited<ReturnType<typeof initializeLogRecorder>>

describe('LedgerClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(async () => {
        recorder = await initializeLogRecorder()
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(async () => {
        await reset()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        recorder.clear()
    })

    describe('parseSupportedVersions', () => {
        it('matches, defaults, or throws for version strings', async () => {
            const client = createLedgerClient(undefined, '3.5')

            expect(() => client.parseSupportedVersions(undefined)).toThrow(
                'Client version missing from response'
            )
            expect(client.parseSupportedVersions('3.5.1')).toBe('3.5')
            expect(client.parseSupportedVersions('9.9.9')).toBe('3.5')

            recorder.assertLogged({
                level: 'warning',
            })
        })
    })

    describe('init', () => {
        it('negotiates version once', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse('3.5.14'))
                .mockResolvedValueOnce(
                    jsonResponse({
                        connectedSynchronizers: [{ synchronizerId: 'sync-1' }],
                    })
                )

            const client = createLedgerClient(undefined, '3.5')
            await client.init()
            await client.get('/v2/state/connected-synchronizers')

            expect(client.getCurrentClientVersion()).toBe('3.5')
            expect(fetchMock).toHaveBeenCalledTimes(2)
        })
    })

    describe('HTTP helpers', () => {
        it('adds Authorization when token is present', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({
                        connectedSynchronizers: [{ synchronizerId: 'sync-1' }],
                    })
                )

            const accessTokenProvider =
                createAccessTokenProvider('ledger-token')
            await createLedgerClient(accessTokenProvider).get(
                '/v2/state/connected-synchronizers'
            )

            expect(accessTokenProvider.getAccessToken).toHaveBeenCalled()
            expect(
                getRequestHeaders(
                    fetchMock,
                    '/v2/state/connected-synchronizers'
                ).authorization
            ).toBe('Bearer ledger-token')
        })

        it('supports get, post, and patch', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({
                        connectedSynchronizers: [
                            { synchronizerId: 'sync-abc' },
                        ],
                    })
                )
                .mockResolvedValueOnce(
                    jsonResponse({ newlyGrantedRights: [{ kind: 'CanActAs' }] })
                )
                .mockResolvedValueOnce(jsonResponse({ user: { id: 'alice' } }))

            const client = createLedgerClient()
            await expect(
                client.get('/v2/state/connected-synchronizers')
            ).resolves.toEqual({
                connectedSynchronizers: [{ synchronizerId: 'sync-abc' }],
            })

            await expect(
                client.post(
                    '/v2/users/{user-id}/rights',
                    {
                        identityProviderId: '',
                        userId: 'alice',
                        rights: [],
                    },
                    { path: { 'user-id': 'alice' } }
                )
            ).resolves.toEqual({ newlyGrantedRights: [{ kind: 'CanActAs' }] })
            expect(getRequestMethod(fetchMock, '/v2/users/')).toBe('POST')

            await expect(
                client.patch(
                    '/v2/users/{user-id}',
                    {
                        user: {
                            id: 'alice',
                            identityProviderId: '',
                            isDeactivated: false,
                            primaryParty: 'alice::namespace',
                        },
                        updateMask: {
                            paths: ['primaryParty'],
                            unknownFields: { fields: [] as never },
                        },
                    },
                    { path: { 'user-id': 'alice' } }
                )
            ).resolves.toEqual({ user: { id: 'alice' } })
        })

        it('rejects API errors from get', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({ message: 'not found' }, 404)
                )

            await expect(
                createLedgerClient().get('/v2/parties/{party}', {
                    path: { party: 'missing::namespace' },
                })
            ).rejects.toBeDefined()
        })
    })

    describe('checkIfPartyExists', () => {
        it('returns true when party is found and false on lookup failure', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({
                        partyDetails: [{ party: 'alice::namespace' }],
                    })
                )
            await expect(
                createLedgerClient().checkIfPartyExists('alice::namespace')
            ).resolves.toBe(true)

            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({ message: 'not found' }, 404)
                )
            await expect(
                createLedgerClient().checkIfPartyExists('missing::namespace')
            ).resolves.toBe(false)
        })
    })

    describe('grantRights', () => {
        it('posts rights and throws when none are granted', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({
                        newlyGrantedRights: [{ kind: 'CanActAs' }],
                    })
                )

            await expect(
                createLedgerClient().grantRights('alice', {
                    actAs: ['alice::namespace'],
                    readAs: ['bob::namespace'],
                })
            ).resolves.toMatchObject({
                newlyGrantedRights: [{ kind: 'CanActAs' }],
            })

            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(jsonResponse({}))
            await expect(
                createLedgerClient().grantRights('alice', {
                    actAs: ['alice::namespace'],
                })
            ).rejects.toThrow('Failed to grant user rights')
        })
    })

    describe('grantMasterUserRights', () => {
        it('posts master user rights', async () => {
            fetchMock.mockResolvedValueOnce(
                jsonResponse({
                    newlyGrantedRights: [{ kind: 'CanReadAsAnyParty' }],
                })
            )

            await expect(
                createLedgerClient().grantMasterUserRights(
                    'master-user',
                    true,
                    true
                )
            ).resolves.toBeUndefined()
            expect(getRequestMethod(fetchMock, '/v2/users/')).toBe('POST')
        })
    })

    describe('createUser', () => {
        const existingUser = {
            id: 'alice',
            identityProviderId: '',
            isDeactivated: false,
            primaryParty: 'alice::namespace',
        }

        it('returns existing user when lookup succeeds', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(jsonResponse({ user: existingUser }))

            await expect(
                createLedgerClient().createUser('alice', 'alice::namespace')
            ).resolves.toEqual(existingUser)
        })

        it('creates user when lookup fails', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({ message: 'not found' }, 404)
                )
                .mockResolvedValueOnce(jsonResponse({ user: existingUser }))

            await expect(
                createLedgerClient().createUser('alice', 'alice::namespace')
            ).resolves.toEqual(existingUser)
            expect(fetchMock).toHaveBeenCalledTimes(3)
        })
    })

    describe('getSynchronizerId', () => {
        it('caches synchronizer id and warns when multiple exist', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({
                        connectedSynchronizers: [
                            { synchronizerId: 'sync-primary' },
                            { synchronizerId: 'sync-secondary' },
                        ],
                    })
                )

            const client = createLedgerClient()
            expect(await client.getSynchronizerId()).toBe('sync-primary')
            expect(await client.getSynchronizerId()).toBe('sync-primary')
            recorder.assertLogged({
                level: 'warning',
            })
            expect(fetchMock).toHaveBeenCalledTimes(2)
        })

        it('throws when no synchronizers are connected', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({ connectedSynchronizers: [] })
                )

            await expect(
                createLedgerClient().getSynchronizerId()
            ).rejects.toThrow('No connected synchronizers found')
        })
    })

    describe('external party helpers', () => {
        it('generateTopology and allocateExternalParty return API responses', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({ partyId: 'generated::namespace' })
                )
                .mockResolvedValueOnce(
                    jsonResponse({ partyId: 'external::namespace' })
                )

            const client = createLedgerClient()
            await expect(
                client.generateTopology('sync-1', 'public-key-bytes', 'alice')
            ).resolves.toEqual({ partyId: 'generated::namespace' })

            const onboardingTransactions = [{ hash: 'tx-hash' }] as never
            const multiHashSignatures = [{ format: 'signature' }] as never
            await expect(
                client.allocateExternalParty(
                    'sync-1',
                    onboardingTransactions,
                    multiHashSignatures
                )
            ).resolves.toEqual({ partyId: 'external::namespace' })
        })
    })

    describe('waitForPartyAndGrantUserRights', () => {
        it('waits for party then grants rights', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({ message: 'not found' }, 404)
                )
                .mockResolvedValueOnce(
                    jsonResponse({
                        partyDetails: [{ party: 'alice::namespace' }],
                    })
                )
                .mockResolvedValueOnce(
                    jsonResponse({
                        newlyGrantedRights: [{ kind: 'CanActAs' }],
                    })
                )

            await expect(
                createLedgerClient().waitForPartyAndGrantUserRights(
                    'alice',
                    'alice::namespace',
                    5,
                    1
                )
            ).resolves.toBeUndefined()
        })

        it('throws when party never appears', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse({ message: 'not found' }, 404)
                )
                .mockResolvedValueOnce(
                    jsonResponse({ message: 'not found' }, 404)
                )

            await expect(
                createLedgerClient().waitForPartyAndGrantUserRights(
                    'alice',
                    'alice::namespace',
                    2,
                    1
                )
            ).rejects.toThrow(
                'timed out waiting for new party to appear after 2 tries'
            )
        })
    })

    describe('retry wrappers', () => {
        it('retries get, post, and patch helpers', async () => {
            fetchMock
                .mockResolvedValueOnce(versionResponse())
                .mockResolvedValueOnce(
                    jsonResponse(grpcError('SEQUENCER_REQUEST_FAILED'), 503)
                )
                .mockResolvedValueOnce(
                    jsonResponse({
                        connectedSynchronizers: [{ synchronizerId: 'sync-1' }],
                    })
                )

            const client = createLedgerClient()
            await expect(
                client.getWithRetry('/v2/state/connected-synchronizers', {
                    retries: 2,
                    delayMs: 1,
                    cantonErrorKeys: [],
                })
            ).resolves.toMatchObject({
                connectedSynchronizers: [{ synchronizerId: 'sync-1' }],
            })

            fetchMock
                .mockResolvedValueOnce(
                    jsonResponse(grpcError('SEQUENCER_REQUEST_FAILED'), 503)
                )
                .mockResolvedValueOnce(
                    jsonResponse({
                        newlyGrantedRights: [{ kind: 'CanActAs' }],
                    })
                )
            await expect(
                client.postWithRetry(
                    '/v2/users/{user-id}/rights',
                    {
                        identityProviderId: '',
                        userId: 'alice',
                        rights: [],
                    },
                    { retries: 2, delayMs: 1, cantonErrorKeys: [] },
                    { path: { 'user-id': 'alice' } }
                )
            ).resolves.toMatchObject({ newlyGrantedRights: expect.any(Array) })

            fetchMock
                .mockResolvedValueOnce(
                    jsonResponse(grpcError('SEQUENCER_REQUEST_FAILED'), 503)
                )
                .mockResolvedValueOnce(jsonResponse({ user: { id: 'alice' } }))
            await expect(
                client.patchWithRetry(
                    '/v2/users/{user-id}',
                    {
                        user: {
                            id: 'alice',
                            identityProviderId: '',
                            isDeactivated: false,
                            primaryParty: 'alice::namespace',
                        },
                        updateMask: {
                            paths: ['primaryParty'],
                            unknownFields: { fields: [] as never },
                        },
                    },
                    { retries: 2, delayMs: 1, cantonErrorKeys: [] },
                    { path: { 'user-id': 'alice' } }
                )
            ).resolves.toMatchObject({ user: { id: 'alice' } })
        })
    })

    describe('is valid get endpoint', () => {
        it('should return true if endpoint is in get endpoint set', () => {
            expect(isValidGetEndpoint('/v2/state/ledger-end')).toBe(true)
        })

        it('should return false if not in the get endpoint set', () => {
            expect(isValidGetEndpoint('/v4/state/ledger-end')).toBe(false)
        })
    })

    describe('is valid post endpoint', () => {
        it('should return true if endpoint is in post endpoint set', () => {
            expect(isValidPostEndpoint('/v2/commands/submit-and-wait')).toBe(
                true
            )
        })

        it('should return false if not in the post endpoint set', () => {
            expect(isValidPostEndpoint('/v2/state/ledger-end')).toBe(false)
        })
    })
})
