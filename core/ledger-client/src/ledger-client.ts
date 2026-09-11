// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    supportedLedgerApiVersions,
    type LedgerApiVersion,
    type LedgerCommonPaths,
    type LedgerCommonSchemas,
    LedgerGetRoutes,
    LedgerPostRoutes,
} from '@canton-network/core-ledger-client-types'
import createClient, { type Client, type FetchOptions } from 'openapi-fetch'
import type { PartyId } from '@canton-network/core-types'
import {
    asJsCantonError,
    defaultRetryableOptions,
    retryable,
    type RetryableOptions,
} from './ledger-api-utils.js'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { getLogger } from '@logtape/logtape'

export const supportedVersions = supportedLedgerApiVersions

export type SupportedVersions = LedgerApiVersion

type paths = LedgerCommonPaths

type SchemaByVersion<Name extends keyof LedgerCommonSchemas> =
    LedgerCommonSchemas[Name]

type ClientsByVersion = {
    [V in SupportedVersions]: Client<paths>
}

export type UserSchema = SchemaByVersion<'User'>

export type Types = LedgerCommonSchemas

// A conditional type that filters the set of OpenAPI path names to those that actually have a defined POST operation.
// Any path without a POST is excluded via the `never` branch of the conditional
export type PatchEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        patch: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Given a pathname (string) that has a POST, this helper type extracts the request body type from the OpenAPI definition.
export type PatchRequest<Path extends PatchEndpoint> = paths[Path] extends {
    patch: { requestBody: { content: { 'application/json': infer Req } } }
}
    ? Req
    : never

// Given a pathname (string) that has a POST, this helper type extracts the 200 response type from the OpenAPI definition.
export type PatchResponse<Path extends PatchEndpoint> = paths[Path] extends {
    patch: {
        responses: { 200: { content: { 'application/json': infer Res } } }
    }
}
    ? Res
    : never

// A conditional type that filters the set of OpenAPI path names to those that actually have a defined POST operation.
// Any path without a POST is excluded via the `never` branch of the conditional
export type PostEndpoint = {
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
export type GetEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        get: unknown
    }
        ? Pathname
        : never
}[keyof paths]

export function isValidGetEndpoint(resource: string): resource is GetEndpoint {
    return LedgerGetRoutes.has(resource)
}

export function isValidPostEndpoint(
    resource: string
): resource is PostEndpoint {
    return LedgerPostRoutes.has(resource)
}

// Similar as above, for GETs
export type GetResponse<Path extends GetEndpoint> = paths[Path] extends {
    get: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

export type GenerateTransactionResponse =
    SchemaByVersion<'GenerateExternalPartyTopologyResponse'>

export type AllocateExternalPartyResponse =
    SchemaByVersion<'AllocateExternalPartyResponse'>
export type OnboardingTransactions = NonNullable<
    SchemaByVersion<'AllocateExternalPartyRequest'>['onboardingTransactions']
>

export type MultiHashSignatures = NonNullable<
    SchemaByVersion<'AllocateExternalPartyRequest'>['multiHashSignatures']
>
export type PrepareSubmissionResponse =
    SchemaByVersion<'JsPrepareSubmissionResponse'>

// Any options the client accepts besides body/params
type ExtraPostOpts = Omit<FetchOptions<paths>, 'body' | 'params'>

export class LedgerClient {
    // privately manage the active connected version and associated client codegen
    private readonly clients: ClientsByVersion
    private clientVersion: SupportedVersions = '3.5'
    private initialized: boolean = false
    private accessTokenProvider: AccessTokenProvider
    private readonly logger = getLogger([
        'core',
        'ledger-client',
        'LedgerClient',
    ])
    private synchronizerId: string | undefined
    baseUrl: URL

    constructor({
        baseUrl,
        accessTokenProvider,
        version,
    }: {
        baseUrl: URL
        accessTokenProvider: AccessTokenProvider
        version?: SupportedVersions
    }) {
        this.accessTokenProvider = accessTokenProvider

        const authenticatedFetch = async (
            url: RequestInfo,
            options: RequestInit = {}
        ) => {
            const token = await this.accessTokenProvider.getAccessToken()
            return fetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
            })
        }

        this.clients = {
            ...supportedVersions.reduce((acc, version) => {
                acc[version] = createClient<paths>({
                    baseUrl: baseUrl.href,
                    fetch: authenticatedFetch,
                })
                return acc
            }, {} as ClientsByVersion),
        }

        this.clientVersion = version ?? this.clientVersion
        this.baseUrl = baseUrl
    }

    private get currentClient(): Client<paths> {
        return this.clients[this.clientVersion] as unknown as Client<paths>
    }

    public async init() {
        if (!this.initialized) {
            //TODO: parse error response and escalate
            const versionFromClient =
                await this.currentClient.GET('/v2/version')

            this.logger.debug('getV2Version response', {
                data: versionFromClient.data,
                status: versionFromClient.response.status,
            })

            this.clientVersion = this.parseSupportedVersions(
                versionFromClient.data?.version
            )
            this.initialized = true

            this.logger.debug(
                `Initializing LedgerClient with version ${this.clientVersion} for url ${this.baseUrl.href} and setting initialized to true`
            )
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
            this.logger.warn(
                `Unknown support of version ${version} (defaulting to ${this.clientVersion}) please check if a newer version is available that support this version of canton.`
            )
            return this.clientVersion
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
    ): Promise<UserSchema> {
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
     * @param maxTries Optional max number of retries with default 30. May be increased if expecting heavy load.
     * @param retryIntervalMs Optional interval between retries to verify that party exists with default 2000ms. May be increased if expecting heavy load.
     * @returns A promise that resolves when the rights have been granted.
     */
    public async waitForPartyAndGrantUserRights(
        userId: string,
        partyId: PartyId,
        maxTries: number = 30,
        retryIntervalMs: number = 2000
    ) {
        await this.init()
        // Wait for party to appear on participant
        let partyFound = false
        let tries = 0

        while (!partyFound && tries < maxTries) {
            partyFound = await this.checkIfPartyExists(partyId)

            await new Promise((resolve) => setTimeout(resolve, retryIntervalMs))
            tries++
        }

        if (tries >= maxTries) {
            throw new Error(
                `timed out waiting for new party to appear after ${maxTries} tries`
            )
        }

        const result = await this.grantRights(userId, {
            actAs: [partyId],
        })

        if (!result.newlyGrantedRights) {
            throw new Error('Failed to grant user rights')
        }

        return
    }

    public async grantRights(
        userId: string,
        userRightsOptions: {
            canReadAsAnyParty?: boolean
            canExecuteAsAnyParty?: boolean
            readAs?: PartyId[]
            actAs?: PartyId[]
        }
    ) {
        await this.init()
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

        return result
    }

    public async allocateExternalParty(
        synchronizerId: string,
        onboardingTransactions: OnboardingTransactions,
        multiHashSignatures: MultiHashSignatures
    ): Promise<AllocateExternalPartyResponse> {
        await this.init()
        const resp = await this.currentClient.POST(
            '/v2/parties/external/allocate',
            {
                body: {
                    synchronizer: synchronizerId,
                    identityProviderId: '',
                    onboardingTransactions,
                    multiHashSignatures,
                },
            }
        )

        return this.valueOrError(resp)
    }

    public async generateTopology(
        synchronizerId: string,
        publicKey: string,
        partyHint: string,
        localParticipantObservationOnly: boolean = false,
        confirmationThreshold: number = 1,
        otherConfirmingParticipantUids: string[] = [],
        observingParticipantUids: string[] = []
    ): Promise<GenerateTransactionResponse> {
        await this.init()

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
            observingParticipantUids,
        }

        this.logger.trace('generateTopology request body', { body })

        const resp = await this.currentClient.POST(
            '/v2/parties/external/generate-topology',
            { body }
        )

        return this.valueOrError(resp)
    }

    // Retrieve the default synchronizer id from the validator.
    // Prefers a synchronizer aliased 'global' over application-specific ones.
    // This synchronizer id is cached for the remainder of this object's life.
    public async getSynchronizerId(): Promise<string> {
        if (this.synchronizerId) return this.synchronizerId
        const response = await this.getWithRetry(
            '/v2/state/connected-synchronizers'
        )
        const synchronizers = response.connectedSynchronizers
        if (!synchronizers?.[0]) {
            throw new Error('No connected synchronizers found')
        }
        const defaultEntry =
            synchronizers.find((s) => s.synchronizerAlias === 'global') ??
            synchronizers.find(
                (s) => s.synchronizerAlias !== 'app-synchronizer'
            ) ??
            synchronizers[0]
        const synchronizerId = defaultEntry.synchronizerId
        if (synchronizers.length > 1) {
            this.logger.warn(
                `Found ${synchronizers.length} synchronizers, defaulting to ${synchronizerId}`
            )
        }
        this.synchronizerId = synchronizerId
        return synchronizerId
    }

    public async postWithRetry<Path extends PostEndpoint>(
        path: Path,
        body: PostRequest<Path>,
        retryOptions: RetryableOptions = defaultRetryableOptions,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        },
        additionalOptions?: ExtraPostOpts
    ): Promise<PostResponse<Path>> {
        return await retryable(
            () => this.post(path, body, params, additionalOptions),
            retryOptions
        ).catch((e) => {
            this.logger.warn(`Error in postWithRetry for path {path}`, {
                path,
                options: retryOptions,
            })
            this.logger.debug({ body })
            throw asJsCantonError(e)
        })
    }

    public async getWithRetry<Path extends GetEndpoint>(
        path: Path,
        retryOptions: RetryableOptions = defaultRetryableOptions,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<GetResponse<Path>> {
        return await retryable(
            () => this.get(path, params),
            retryOptions
        ).catch((e) => {
            this.logger.warn(
                `Error in getWithRetry for path ${path} with retry options ${JSON.stringify(retryOptions)}`
            )

            throw asJsCantonError(e)
        })
    }

    public async patchWithRetry<Path extends PatchEndpoint>(
        path: Path,
        body: PatchRequest<Path>,
        retryOptions: RetryableOptions = defaultRetryableOptions,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        },
        additionalOptions?: ExtraPostOpts
    ): Promise<PatchResponse<Path>> {
        return await retryable(
            () => this.patch(path, body, params, additionalOptions),
            retryOptions
        ).catch((e) => {
            this.logger.warn(
                `Error in patchWithRetry for path ${path} with body retry options ${JSON.stringify(retryOptions)}`
            )
            throw asJsCantonError(e)
        })
    }

    public async patch<Path extends PatchEndpoint>(
        path: Path,
        body: PatchRequest<Path>,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string | number | boolean>
        },
        // needed when posting to /packages, so content type and jsonification of bytes can be overriden
        additionalOptions?: ExtraPostOpts
    ): Promise<PatchResponse<Path>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { body, params, ...additionalOptions } as any

        const resp = await this.currentClient.PATCH(path, options)
        return this.valueOrError(resp)
    }

    public async post<Path extends PostEndpoint>(
        path: Path,
        body: PostRequest<Path>,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string | number | boolean>
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
