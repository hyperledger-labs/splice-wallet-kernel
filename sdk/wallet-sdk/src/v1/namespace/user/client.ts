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
        const rights = params.userRights
            ? this.userRightsOptionsToRights(params.userRights)
            : []

        return this.ctx.ledgerProvider.request<Ops.PostV2Users>({
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
                        userId: params.userId,
                        rights,
                    },
                    path: {
                        'user-id': params.userId,
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
