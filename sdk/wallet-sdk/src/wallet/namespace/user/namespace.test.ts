// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { SDKLogger } from '../../logger'
import { SDKErrorHandler } from '../../error/handler'
import { UserNamespace } from './namespace'

const makeProvider = (overrides: Record<string, unknown> = {}) => ({
    request: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    ...overrides,
})

const logger = new SDKLogger('console')
const sdkContext = {
    ledgerProvider: makeProvider(),
    userId: 'ledger-api-user',
    logger: new SDKLogger('console'),
    error: new SDKErrorHandler(logger),
    defaultSynchronizerId: 'syncid',
}

describe('user namespace', () => {
    it('should list users', async () => {
        const usersResponse = {
            users: [
                {
                    id: 'app-user',
                    primaryParty:
                        'app_user_localnet-localparty-1::12209b1d0dd8b25e2002a452b99d4bc0defead64fd7a925a3cb50c702a06154275ad',
                    isDeactivated: false,
                    metadata: {
                        resourceVersion: '0',
                        annotations: {},
                    },
                    identityProviderId: '',
                    primaryPartyAuthentication: false,
                },
                {
                    id: 'ledger-api-user',
                    primaryParty:
                        'app_user_localnet-localparty-1::12209b1d0dd8b25e2002a452b99d4bc0defead64fd7a925a3cb50c702a06154275ad',
                    isDeactivated: false,
                    metadata: {
                        resourceVersion: '1',
                        annotations: {},
                    },
                    identityProviderId: '',
                    primaryPartyAuthentication: false,
                },
                {
                    id: 'participant_admin',
                    primaryParty: '',
                    isDeactivated: false,
                    metadata: {
                        resourceVersion: '0',
                        annotations: {},
                    },
                    identityProviderId: '',
                    primaryPartyAuthentication: false,
                },
            ],
            nextPageToken: '',
        }
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockResolvedValue(usersResponse)
        const res = await user.list()
        expect(res).toStrictEqual(usersResponse)
    })

    it('should list user rights', async () => {
        const rightsResponse = {
            rights: [
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'app_user_localnet-localparty-1::12209b1d0dd8b25e2002a452b99d4bc0defead64fd7a925a3cb50c702a06154275ad',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-14-alice::1220444c501c25eb801aff0c783e9b07b6e5d37a2eef7f179ea81a17b3a4b1f8ed83',
                            },
                        },
                    },
                },
                {
                    kind: {
                        ParticipantAdmin: {
                            value: {},
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-14-alice::12201201f122454909eab3ec850de122941afff36f3c4f0706110716d6b345528cad',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-01-alice::122025126318c48c25a01bd1d26f4e1b0de8d8991aea5539254e7fdc8c0decf30af6',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-01-alice::1220ee2624190834dddf28f194685acee8f00cbde9ee0d211dae277f4d799884f289',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-14-bob::122084ed654b18e1311a6eadfaceef561e16c80b6ddae8533881ba5b91778993a6d5',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-01-bob::1220322e980864fa738a1f17dd575e751799988d64374296165d19c5354696952b3d',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-14-bob::122042b4aa61c317749f36d1f7bb4f42da8fc6680ffea496a6e768c843d01247b354',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-01-bob::1220cc52fd4f8b8a3bbb4d4158ba6268b548b229afec8f4471a59e15b3923b316323',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-01-bob::122027eb73ddb80aa641a6d40f8ccb61e432221cf7ee2752e301db31c1c6f0dadf35',
                            },
                        },
                    },
                },
                {
                    kind: {
                        CanActAs: {
                            value: {
                                party: 'v1-01-alice::122089a92b7a2fc198e1df45944c818413e43b34863b4107af9c3aa05d0ac0d6ddaf',
                            },
                        },
                    },
                },
            ],
        }
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockResolvedValue(rightsResponse)
        const res = await user.rights.list()
        expect(res).toStrictEqual(rightsResponse)
    })

    it('should skip user creation if user already exists', async () => {
        const usersResponse = {
            user: {
                id: 'ledger-api-user',
                primaryParty:
                    'app_user_localnet-localparty-1::12209b1d0dd8b25e2002a452b99d4bc0defead64fd7a925a3cb50c702a06154275ad',
                isDeactivated: false,
                metadata: {
                    resourceVersion: '1',
                    annotations: {},
                },
                identityProviderId: '',
                primaryPartyAuthentication: false,
            },
        }
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockReset()
        sdkContext.ledgerProvider.request.mockResolvedValueOnce(usersResponse)
        const result = await user.create({
            userId: 'ledger-api-user',
            primaryParty: '',
        })
        expect(result).toStrictEqual(usersResponse.user)
        expect(sdkContext.ledgerProvider.request).toHaveBeenCalledTimes(1)
        expect(sdkContext.ledgerProvider.request).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    resource: '/v2/users/{user-id}',
                    requestMethod: 'get',
                }),
            })
        )
    })

    it('should create new user if it does not already exist', async () => {
        const createdUserResponse = {
            user: {
                id: 'new-user',
                primaryParty:
                    'app_user_localnet-localparty-1::12209b1d0dd8b25e2002a452b99d4bc0defead64fd7a925a3cb50c702a06154275ad',
                isDeactivated: false,
                metadata: {
                    resourceVersion: '1',
                    annotations: {},
                },
                identityProviderId: '',
                primaryPartyAuthentication: false,
            },
        }
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockReset()

        sdkContext.ledgerProvider.request.mockImplementationOnce(() =>
            Promise.reject({ code: 'USER_NOT_FOUND' })
        )

        sdkContext.ledgerProvider.request.mockResolvedValueOnce(
            createdUserResponse
        )

        const result = await user.create({
            userId: 'new-user',
            primaryParty: createdUserResponse.user.primaryParty,
        })

        expect(result).toStrictEqual(createdUserResponse.user)
        expect(sdkContext.ledgerProvider.request).toHaveBeenCalledTimes(2)

        expect(
            sdkContext.ledgerProvider.request.mock.calls[1][0]
        ).toStrictEqual({
            method: 'ledgerApi',
            params: {
                body: {
                    rights: [],
                    user: {
                        id: 'new-user',
                        identityProviderId: '',
                        isDeactivated: false,
                        primaryParty:
                            'app_user_localnet-localparty-1::12209b1d0dd8b25e2002a452b99d4bc0defead64fd7a925a3cb50c702a06154275ad',
                    },
                },
                requestMethod: 'post',
                resource: '/v2/users',
            },
        })
    })

    it('should create new user with rights', async () => {
        const createdUserResponse = {
            user: {
                id: 'user-with-rights',
                primaryParty: '',
                isDeactivated: false,
                metadata: {
                    resourceVersion: '1',
                    annotations: {},
                },
                identityProviderId: '',
                primaryPartyAuthentication: false,
            },
        }
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockReset()

        sdkContext.ledgerProvider.request.mockImplementationOnce(() =>
            Promise.reject({ code: 'USER_NOT_FOUND' })
        )

        sdkContext.ledgerProvider.request.mockResolvedValueOnce(
            createdUserResponse
        )

        const result = await user.create({
            userId: 'user-with-rights',
            primaryParty: createdUserResponse.user.primaryParty,
            userRights: {
                actAs: ['alice::abc'],
                readAs: ['bob::def'],
            },
        })

        expect(result).toStrictEqual({
            id: 'user-with-rights',
            identityProviderId: '',
            isDeactivated: false,
            metadata: {
                annotations: {},
                resourceVersion: '1',
            },
            primaryParty: '',
            primaryPartyAuthentication: false,
        })

        expect(
            sdkContext.ledgerProvider.request.mock.calls[1][0]
        ).toStrictEqual({
            method: 'ledgerApi',
            params: {
                body: {
                    rights: [
                        {
                            kind: {
                                CanReadAs: {
                                    value: {
                                        party: 'bob::def',
                                    },
                                },
                            },
                        },
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: 'alice::abc',
                                    },
                                },
                            },
                        },
                    ],
                    user: {
                        id: 'user-with-rights',
                        identityProviderId: '',
                        isDeactivated: false,
                        primaryParty: '',
                    },
                },
                requestMethod: 'post',
                resource: '/v2/users',
            },
        })
    })

    it('should throw an error if ledger api is unsuccessful', async () => {
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockReset()

        sdkContext.ledgerProvider.request.mockImplementationOnce(() =>
            Promise.reject({ code: 'USER_NOT_FOUND' })
        )

        sdkContext.ledgerProvider.request.mockResolvedValueOnce(undefined)

        await expect(
            user.create({
                userId: 'user-with-rights',
                primaryParty: '',
                userRights: {
                    actAs: ['alice::abc'],
                    readAs: ['bob::def'],
                },
            })
        ).rejects.toThrow()
    })

    it('should grant rights to a user', async () => {
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockReset()

        sdkContext.ledgerProvider.request.mockResolvedValueOnce(undefined)

        await user.rights.grant({
            userId: 'new-user2',
            userRights: {
                readAs: ['alice::abc'],
            },
        })

        expect(
            sdkContext.ledgerProvider.request.mock.calls[0][0]
        ).toStrictEqual({
            method: 'ledgerApi',
            params: {
                body: {
                    identityProviderId: '',
                    rights: [
                        {
                            kind: {
                                CanReadAs: {
                                    value: {
                                        party: 'alice::abc',
                                    },
                                },
                            },
                        },
                    ],
                    userId: 'new-user2',
                },
                path: {
                    'user-id': 'new-user2',
                },
                requestMethod: 'post',
                resource: '/v2/users/{user-id}/rights',
            },
        })
    })

    it('should grant rights to a user for canExecuteAsAnyParty and canReadAsAnyParty', async () => {
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockReset()

        sdkContext.ledgerProvider.request.mockResolvedValueOnce(undefined)

        await user.rights.grant({
            userId: 'can-execute-and-read',
            userRights: {
                canExecuteAsAnyParty: true,
                canReadAsAnyParty: true,
            },
        })

        expect(
            sdkContext.ledgerProvider.request.mock.calls[0][0]
        ).toStrictEqual({
            method: 'ledgerApi',
            params: {
                body: {
                    identityProviderId: '',
                    rights: [
                        {
                            kind: {
                                CanReadAsAnyParty: {
                                    value: {},
                                },
                            },
                        },
                        {
                            kind: {
                                CanExecuteAsAnyParty: {
                                    value: {},
                                },
                            },
                        },
                    ],
                    userId: 'can-execute-and-read',
                },
                path: {
                    'user-id': 'can-execute-and-read',
                },
                requestMethod: 'post',
                resource: '/v2/users/{user-id}/rights',
            },
        })
    })

    it('should revoke rights to a user', async () => {
        const user = new UserNamespace(sdkContext)
        sdkContext.ledgerProvider.request.mockReset()

        sdkContext.ledgerProvider.request.mockResolvedValueOnce(undefined)

        await user.rights.revoke({
            userId: 'revoked-rights-user',
            userRights: {
                readAs: ['alice::abc'],
            },
        })

        expect(
            sdkContext.ledgerProvider.request.mock.calls[0][0]
        ).toStrictEqual({
            method: 'ledgerApi',
            params: {
                body: {
                    identityProviderId: '',
                    rights: [
                        {
                            kind: {
                                CanReadAs: {
                                    value: {
                                        party: 'alice::abc',
                                    },
                                },
                            },
                        },
                    ],
                    userId: 'revoked-rights-user',
                },
                path: {
                    'user-id': 'revoked-rights-user',
                },
                requestMethod: 'patch',
                resource: '/v2/users/{user-id}/rights',
            },
        })
    })
})
