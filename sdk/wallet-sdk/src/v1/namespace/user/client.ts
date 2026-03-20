// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../../sdk.js'

import { SDKLogger } from '../../logger/logger.js'
import { CreateUserParams, GrantRightsParams } from './types.js'
import { Ops } from '@canton-network/core-provider-ledger'
import { UserRights } from './types.js'

export class UserService {
    private readonly logger: SDKLogger

    constructor(private readonly ctx: WalletSdkContext) {
        this.logger = ctx.logger.child({ namespace: 'UserService' })
    }

    async create(params: CreateUserParams) {
        try {
            const existing = await this.ctx.ledgerProvider
                .request<Ops.GetV2UsersUserId>({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/users/{user-id}',
                        requestMethod: 'get',
                        path: { 'user-id': params.userId },
                        query: { 'identity-provider-id': params.idp ?? '' },
                    },
                })
                .catch((err) => {
                    if (err.status === 404) return null
                    this.ctx.error.throw({
                        message: `Failed to get user: ${err.message}`,
                        type: 'CantonError',
                    })
                })

            if (existing?.user) {
                this.ctx.logger.info(
                    { userId: params.userId },
                    'User already exists; skipping creation.'
                )
                return existing.user
            }

            const rights = params.userRights
                ? this.userRightsOptionsToRights(params.userRights)
                : []

            const response =
                await this.ctx.ledgerProvider.request<Ops.PostV2Users>({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/users',
                        requestMethod: 'post',
                        body: {
                            user: {
                                identityProviderId: params.idp ?? '',
                                id: params.userId,
                                isDeactivated: false,
                                primaryParty: params.primaryParty,
                            },
                            rights,
                        },
                    },
                })

            if (!response?.user) {
                this.ctx.error.throw({
                    message:
                        'Ledger API returned success but user object was missing',
                    type: 'Unexpected',
                })
            }

            return response.user
        } catch (error) {
            this.ctx.logger.error(
                { error, userId: params.userId },
                'Failed to ensure user existence in Ledger'
            )

            this.ctx.error.throw({
                message: `Failed to ensure user existence in Ledger for ${params.userId}: ${error} `,
                type: 'Unexpected',
            })
        }
    }
    async list() {
        return this.ctx.ledgerProvider.request<Ops.GetV2Users>({
            method: 'ledgerApi',
            params: {
                requestMethod: 'get',
                resource: '/v2/users',
                query: {},
            },
        })
    }

    rights = {
        grant: async (params: GrantRightsParams) => {
            const rights = this.userRightsOptionsToRights(params.userRights)

            await this.ctx.ledgerProvider.request<Ops.PostV2UsersUserIdRights>({
                method: 'ledgerApi',
                params: {
                    requestMethod: 'post',
                    resource: '/v2/users/{user-id}/rights',
                    body: {
                        identityProviderId: params.idp ?? '',
                        userId: params.userId ?? this.ctx.userId,
                        rights,
                    },
                    path: {
                        'user-id': params.userId ?? this.ctx.userId,
                    },
                },
            })
        },
    }

    private userRightsOptionsToRights(userRightsOptions: UserRights) {
        const rights = []

        for (const partyId of userRightsOptions.readAs ?? []) {
            rights.push({
                kind: {
                    CanReadAs: {
                        value: {
                            party: partyId,
                        },
                    },
                },
            })
        }

        for (const partyId of userRightsOptions.actAs ?? []) {
            rights.push({
                kind: {
                    CanActAs: {
                        value: {
                            party: partyId,
                        },
                    },
                },
            })
        }

        if (userRightsOptions.canReadAsAnyParty) {
            rights.push({
                kind: {
                    CanReadAsAnyParty: { value: {} as Record<string, never> },
                },
            })
        }
        if (userRightsOptions.canExecuteAsAnyParty) {
            rights.push({
                kind: {
                    CanExecuteAsAnyParty: {
                        value: {} as Record<string, never>,
                    },
                },
            })
        }

        if (userRightsOptions.participantAdmin) {
            rights.push({
                kind: {
                    ParticipantAdmin: {
                        value: {} as Record<string, never>,
                    },
                },
            })
        }
        return rights
    }
}
