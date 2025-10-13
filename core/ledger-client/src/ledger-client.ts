// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as v3_3 from './generated-clients/openapi-3.3.0-SNAPSHOT.js'

import * as v3_4 from './generated-clients/openapi-3.4.0-SNAPSHOT.js'
import createClient, { Client, FetchOptions } from 'openapi-fetch'
import { Logger } from 'pino'
import { PartyId } from '@canton-network/core-types'

export const supportedVersions = ['3.3', '3.4'] as const

export type SupportedVersions = (typeof supportedVersions)[number]

export type Types = v3_3.components['schemas'] | v3_4.components['schemas']

type paths = v3_3.paths | v3_4.paths

// A conditional type that filters the set of OpenAPI path names to those that actually have a defined POST operation.
// Any path without a POST is excluded via the `never` branch of the conditional
type PostEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        post: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Given a pathname (string) that has a POST, this helper type extracts the request body type from the OpenAPI definition.
export type PostRequest<Path extends PostEndpoint> = paths[Path] extends {
    post: { requestBody: { content: { 'application/json': infer Req } } }
}
    ? Req
    : never

// Given a pathname (string) that has a POST, this helper type extracts the 200 response type from the OpenAPI definition.
export type PostResponse<Path extends PostEndpoint> = paths[Path] extends {
    post: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

// Similar as above, for GETs
type GetEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        get: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Similar as above, for GETs
export type GetResponse<Path extends GetEndpoint> = paths[Path] extends {
    get: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

// Explicitly use the 3.3 schema here, as there has not been a 3.4 snapshot containing these yet
export type GenerateTransactionResponse =
    v3_3.components['schemas']['GenerateExternalPartyTopologyResponse']

export type AllocateExternalPartyResponse =
    v3_3.components['schemas']['AllocateExternalPartyResponse']

export type OnboardingTransactions = NonNullable<
    v3_3.components['schemas']['AllocateExternalPartyRequest']['onboardingTransactions']
>

export type MultiHashSignatures = NonNullable<
    v3_3.components['schemas']['AllocateExternalPartyRequest']['multiHashSignatures']
>
// Any options the client accepts besides body/params
type ExtraPostOpts = Omit<FetchOptions<paths>, 'body' | 'params'>

export class LedgerClient {
    // privately manage the active connected version and associated client codegen
    private readonly clients: Record<SupportedVersions, Client<paths>>
    private clientVersion: SupportedVersions = '3.3' // default to 3.3 if not provided
    private currentClient: Client<paths>
    private initialized: boolean = false
    private readonly logger: Logger

    constructor(
        baseUrl: URL,
        token: string,
        _logger: Logger,
        version?: SupportedVersions
    ) {
        this.logger = _logger.child({ component: 'LedgerClient' })
        this.clients = {
            '3.3': createClient<v3_3.paths>({
                baseUrl: baseUrl.href,
                fetch: async (url: RequestInfo, options: RequestInit = {}) => {
                    return fetch(url, {
                        ...options,
                        headers: {
                            ...(options.headers || {}),
                            Authorization: `Bearer ${token}`,
                        },
                    })
                },
            }),
            '3.4': createClient<v3_4.paths>({
                baseUrl: baseUrl.href,
                fetch: async (url: RequestInfo, options: RequestInit = {}) => {
                    return fetch(url, {
                        ...options,
                        headers: {
                            ...(options.headers || {}),
                            Authorization: `Bearer ${token}`,
                        },
                    })
                },
            }),
        }

        this.clientVersion = version ?? this.clientVersion
        this.currentClient = this.clients[this.clientVersion]
    }

    public async init() {
        if (!this.initialized) {
            const versionFromClient =
                await this.currentClient.GET('/v2/version')
            this.clientVersion = this.parseSupportedVersions(
                versionFromClient.data?.version
            )
            this.initialized = true
        }
    }

    public getCurrentClientVersion(): SupportedVersions {
        return this.clientVersion
    }

    parseSupportedVersions(version: string | undefined): SupportedVersions {
        if (!version) {
            throw new Error('Client version missing from response')
        }

        const match = supportedVersions.find((v) => version.startsWith(v))
        if (!match) {
            throw new Error(`Unsupported version - found ${version}`)
        }

        return match
    }

    /**
     * Check if a party exists
     *
     * @param partyId The ID of the party to look for
     * @returns A promise to resolves to a boolean.
     */
    public async checkIfPartyExists(partyId: PartyId): Promise<boolean> {
        try {
            const party = await this.get('/v2/parties/{party}', {
                path: { party: partyId },
            })
            return (
                party.partyDetails !== undefined &&
                party.partyDetails[0].party === partyId
            )
        } catch {
            return false
        }
    }

    /**
     * grant "Master User" rights to a user.
     *
     * this require running with an admin token.
     *
     * @param userId The ID of the user to grant rights to.
     * @param canReadAsAnyParty define if the user can read as any party.
     * @param canExecuteAsAnyParty define if the user can execute as any party.
     */
    public async grantMasterUserRights(
        userId: string,
        canReadAsAnyParty: boolean,
        canExecuteAsAnyParty: boolean
    ) {
        const rights = []
        if (canReadAsAnyParty) {
            rights.push({
                kind: {
                    CanReadAsAnyParty: { value: {} as Record<string, never> },
                },
            })
        }
        if (canExecuteAsAnyParty) {
            rights.push({
                kind: {
                    CanExecuteAsAnyParty: {
                        value: {} as Record<string, never>,
                    },
                },
            })
        }

        const result = await this.post(
            '/v2/users/{user-id}/rights',
            {
                identityProviderId: '',
                userId,
                rights,
            },
            {
                path: {
                    'user-id': userId,
                },
            }
        )

        if (!result.newlyGrantedRights) {
            throw new Error('Failed to grant user rights')
        }
    }

    /**
     * Create a new user.
     *
     * @param userId The ID of the user to create.
     * @param primaryParty The primary party of the user.
     */
    public async createUser(
        userId: string,
        primaryParty: PartyId
    ): Promise<v3_3.components['schemas']['User']> {
        try {
            const existing = await this.get('/v2/users/{user-id}', {
                path: { 'user-id': userId },
            })

            if (existing && existing.user) {
                return existing.user!
            }
        } catch {
            //TODO: proper error handling based on daml code
            // we continue if code is:
            // code: 'USER_NOT_FOUND',
            // cause: 'getting user failed for unknown user "master-user"',
        }

        return (
            await this.post('/v2/users', {
                user: {
                    identityProviderId: '',
                    id: userId,
                    isDeactivated: false,
                    primaryParty: primaryParty,
                },
                rights: [
                    {
                        kind: {
                            ParticipantAdmin: {
                                value: {} as Record<string, never>,
                            },
                        },
                    },
                ],
            })
        ).user!
    }

    /**
     * Grants a user the right to act as a party, while ensuring the party exists.
     *
     * @param userId The ID of the user to grant rights to.
     * @param partyId The ID of the party to grant rights for.
     * @returns A promise that resolves when the rights have been granted.
     */
    public async grantUserRights(userId: string, partyId: PartyId) {
        await this.init()
        // Wait for party to appear on participant
        let partyFound = false
        let tries = 0
        const maxTries = 30

        while (!partyFound && tries < maxTries) {
            partyFound = await this.checkIfPartyExists(partyId)

            await new Promise((resolve) => setTimeout(resolve, 2000))
            tries++
        }

        if (tries >= maxTries) {
            throw new Error('timed out waiting for new party to appear')
        }

        // Assign user rights to party
        const result = await this.post(
            '/v2/users/{user-id}/rights',
            {
                identityProviderId: '',
                userId,
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: partyId,
                                },
                            },
                        },
                    },
                ],
            },
            {
                path: {
                    'user-id': userId,
                },
            }
        )

        if (!result.newlyGrantedRights) {
            throw new Error('Failed to grant user rights')
        }

        return
    }

    public async grantRights(
        userId: string,
        readAs?: PartyId[],
        actAs?: PartyId[]
    ) {
        await this.init()
        const rights = []

        for (const partyId of readAs ?? []) {
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

        for (const partyId of actAs ?? []) {
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

        const result = await this.post(
            '/v2/users/{user-id}/rights',
            {
                identityProviderId: '',
                userId,
                rights,
            },
            {
                path: {
                    'user-id': userId,
                },
            }
        )

        if (!result.newlyGrantedRights) {
            throw new Error('Failed to grant user rights')
        }

        return
    }

    public async grantReadAsRights(userId: string, partyId: PartyId) {
        await this.init()

        // Assign user rights to party
        const result = await this.post(
            '/v2/users/{user-id}/rights',
            {
                identityProviderId: '',
                userId,
                rights: [
                    {
                        kind: {
                            CanReadAs: {
                                value: {
                                    party: partyId,
                                },
                            },
                        },
                    },
                ],
            },
            {
                path: {
                    'user-id': userId,
                },
            }
        )

        if (!result.newlyGrantedRights) {
            throw new Error('Failed to grant user rights')
        }

        return
    }

    /** TODO: simplify once 3.4 snapshot contains this endpoint */
    public async allocateExternalParty(
        synchronizerId: string,
        onboardingTransactions: OnboardingTransactions,
        multiHashSignatures: MultiHashSignatures
    ): Promise<AllocateExternalPartyResponse> {
        await this.init()

        if (this.clientVersion !== '3.3') {
            throw new Error(
                'allocateExternalParty is only supported on 3.3 clients'
            )
        }

        const client: Client<v3_3.paths> = this.clients['3.3']

        const resp = await client.POST('/v2/parties/external/allocate', {
            body: {
                synchronizer: synchronizerId,
                identityProviderId: '',
                onboardingTransactions,
                multiHashSignatures,
            },
        })

        return this.valueOrError(resp)
    }

    /** TODO: simplify once 3.4 snapshot contains this endpoint  */
    public async generateTopology(
        synchronizerId: string,
        publicKey: string,
        partyHint: string,
        localParticipantObservationOnly: boolean = false,
        confirmationThreshold: number = 1,
        otherConfirmingParticipantUids: string[] = []
    ): Promise<GenerateTransactionResponse> {
        await this.init()

        if (this.clientVersion !== '3.3') {
            throw new Error(
                'allocateExternalParty is only supported on 3.3 clients'
            )
        }

        const client: Client<v3_3.paths> = this.clients['3.3']

        const body = {
            synchronizer: synchronizerId,
            partyHint,
            publicKey: {
                format: 'CRYPTO_KEY_FORMAT_RAW',
                keyData: publicKey,
                keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519',
            },
            localParticipantObservationOnly,
            confirmationThreshold,
            otherConfirmingParticipantUids,
        }

        this.logger.debug(body, 'generateTopology request body')

        const resp = await client.POST(
            '/v2/parties/external/generate-topology',
            { body }
        )

        return this.valueOrError(resp)
    }

    public async post<Path extends PostEndpoint>(
        path: Path,
        body: PostRequest<Path>,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        },
        // needed when posting to /packages, so content type and jsonification of bytes can be overriden
        additionalOptions?: ExtraPostOpts
    ): Promise<PostResponse<Path>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { body, params, ...additionalOptions } as any

        const resp = await this.currentClient.POST(path, options)
        return this.valueOrError(resp)
    }

    public async get<Path extends GetEndpoint>(
        path: Path,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<GetResponse<Path>> {
        await this.init()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { params } as any
        const resp = await this.currentClient.GET(path, options)
        return this.valueOrError(resp)
    }

    private async valueOrError<T>(response: {
        data?: T
        error?: unknown
    }): Promise<T> {
        if (response.data === undefined) {
            return Promise.reject(response.error)
        } else {
            return Promise.resolve(response.data)
        }
    }
}
