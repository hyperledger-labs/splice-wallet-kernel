// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as v3_3 from './generated-clients/openapi-3.3.0-SNAPSHOT.js'

import * as v3_4 from './generated-clients/openapi-3.4.7.js'
import createClient, { Client, FetchOptions } from 'openapi-fetch'
import { Logger } from 'pino'
import { PartyId } from '@canton-network/core-types'
import {
    asJsCantonError,
    defaultRetryableOptions,
    retryable,
    retryableOptions,
} from './ledger-api-utils.js'

import { ACSHelper, AcsHelperOptions } from './acs/acs-helper.js'
import { SharedACSCache } from './acs/acs-shared-cache.js'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'
export const supportedVersions = ['3.3', '3.4'] as const

export type SupportedVersions = (typeof supportedVersions)[number]

export type Types = v3_3.components['schemas'] | v3_4.components['schemas']
type paths = v3_3.paths | v3_4.paths
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

// Similar as above, for GETs
export type GetResponse<Path extends GetEndpoint> = paths[Path] extends {
    get: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

// Explicitly use the 3.3 schema here, as there has not been a 3.4 snapshot containing these yet
export type GenerateTransactionResponse =
    | v3_3.components['schemas']['GenerateExternalPartyTopologyResponse']
    | v3_4.components['schemas']['GenerateExternalPartyTopologyResponse']

export type AllocateExternalPartyResponse =
    | v3_3.components['schemas']['AllocateExternalPartyResponse']
    | v3_4.components['schemas']['AllocateExternalPartyResponse']
export type OnboardingTransactions = NonNullable<
    | v3_3.components['schemas']['AllocateExternalPartyRequest']['onboardingTransactions']
    | v3_4.components['schemas']['AllocateExternalPartyRequest']['onboardingTransactions']
>

export type MultiHashSignatures = NonNullable<
    | v3_3.components['schemas']['AllocateExternalPartyRequest']['multiHashSignatures']
    | v3_4.components['schemas']['AllocateExternalPartyRequest']['multiHashSignatures']
>
// Any options the client accepts besides body/params
type ExtraPostOpts = Omit<FetchOptions<paths>, 'body' | 'params'>

export class LedgerClient {
    // privately manage the active connected version and associated client codegen
    private readonly clients: Record<SupportedVersions, Client<paths>>
    private clientVersion: SupportedVersions = '3.4' // default to 3.4 if not provided
    private currentClient: Client<paths>
    private initialized: boolean = false
    private accessTokenProvider: AccessTokenProvider | undefined
    private acsHelper: ACSHelper
    private readonly logger: Logger
    private synchronizerId: string | undefined
    baseUrl: URL

    constructor({
        baseUrl,
        logger,
        isAdmin,
        accessToken,
        accessTokenProvider,
        version,
        acsHelperOptions,
        ...options
    }: {
        baseUrl: URL
        logger: Logger
        isAdmin?: boolean
        accessToken?: string | undefined
        accessTokenProvider?: AccessTokenProvider | undefined
        version?: SupportedVersions
        acsHelperOptions?: AcsHelperOptions
        fetch?: (url: RequestInfo, options: RequestInit) => Promise<Response>
    }) {
        this.logger = logger.child({ component: 'LedgerClient' })
        this.accessTokenProvider = accessTokenProvider

        const baseFetch = options.fetch ?? fetch
        const authenticatedFetch = async (
            url: RequestInfo,
            options: RequestInit = {}
        ) => {
            let token = accessToken
            if (this.accessTokenProvider) {
                token =
                    (isAdmin ?? false)
                        ? await this.accessTokenProvider.getAdminAccessToken()
                        : await this.accessTokenProvider.getUserAccessToken()
            }
            return baseFetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
            })
        }

        this.clients = {
            '3.3': createClient<v3_3.paths>({
                baseUrl: baseUrl.href,
                fetch: authenticatedFetch,
            }),
            '3.4': createClient<v3_4.paths>({
                baseUrl: baseUrl.href,
                fetch: authenticatedFetch,
            }),
        }

        this.clientVersion = version ?? this.clientVersion
        this.currentClient = this.clients[this.clientVersion]
        this.baseUrl = baseUrl
        this.acsHelper = new ACSHelper(
            this,
            logger,
            acsHelperOptions,
            SharedACSCache
        )
    }

    public async init() {
        if (!this.initialized) {
            const versionFromClient =
                await this.currentClient.GET('/v2/version')
            this.clientVersion = this.parseSupportedVersions(
                versionFromClient.data?.version
            )
            this.currentClient = this.clients[this.clientVersion]
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

    /** TODO: simplify once 3.4 snapshot contains this endpoint */
    public async allocateExternalParty(
        synchronizerId: string,
        onboardingTransactions: OnboardingTransactions,
        multiHashSignatures: MultiHashSignatures
    ): Promise<AllocateExternalPartyResponse> {
        await this.init()

        if (this.clientVersion == '3.3') {
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
        } else {
            const client: Client<v3_4.paths> = this.clients['3.4']

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
    }

    /** TODO: simplify once 3.4 snapshot contains this endpoint  */
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

        if (this.clientVersion == '3.3') {
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
                observingParticipantUids,
            }

            this.logger.debug(body, 'generateTopology request body')

            const resp = await client.POST(
                '/v2/parties/external/generate-topology',
                { body }
            )

            return this.valueOrError(resp)
        } else {
            const client: Client<v3_4.paths> = this.clients['3.4']

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

            this.logger.debug(body, 'generateTopology request body')

            const resp = await client.POST(
                '/v2/parties/external/generate-topology',
                { body }
            )

            return this.valueOrError(resp)
        }
    }
    /*

async function processArraysAsync<T, U, R>(
  arr1: T[],
  arr2: U[],
  asyncOperation: (item1: T, item2: U, index: number) => Promise<R>
): Promise<R[]> {
  // Ensure arrays have the same length for direct element pairing
  if (arr1.length !== arr2.length) {
    throw new Error("Arrays must have the same length for pairing.");
  }

  // Create an array of Promises by mapping over one array and using the index
  // to access elements from both arrays.
  const promises = arr1.map(async (item1, index) => {
    const item2 = arr2[index];
    return await asyncOperation(item1, item2, index);
  });

  // Await all promises to resolve and return the array of results.
  return await Promise.all(promises);
}*/
    async activeContracts(options: {
        offset: number
        templateIds?: string[]
        parties?: string[] //TODO: Figure out if this should use this.partyId by default and not allow cross party filtering
        filterByParty?: boolean
        interfaceIds?: string[]
        limit?: number
    }): Promise<Array<Types['JsGetActiveContractsResponse']>> {
        const {
            offset,
            templateIds,
            parties,
            filterByParty,
            interfaceIds,
            limit,
        } = options

        this.logger.info(options, 'options for active contracts')

        if (
            templateIds &&
            templateIds.length > 0 &&
            parties &&
            parties.length > 0
        ) {
            return this.acsHelper.activeContractsForTemplates(
                offset,
                parties,
                templateIds
            )
        }

        if (
            interfaceIds &&
            interfaceIds.length > 0 &&
            parties &&
            parties.length > 0
        ) {
            this.logger.info(`made it to active contracts for itnerfaces`)
            return this.acsHelper.activeContractsForInterfaces(
                offset,
                parties,
                interfaceIds
            )
        }

        if (interfaceIds?.length === 1 && parties?.length === 1) {
            const party = parties[0]
            const interfaceId = interfaceIds[0]
            return this.acsHelper.activeContractsForInterface(
                offset,
                party,
                interfaceId
            )
        }

        if (
            filterByParty &&
            !templateIds?.length &&
            !interfaceIds?.length &&
            parties?.length === 1
        ) {
            const party = parties[0]
            const r = this.acsHelper.activeContractsForInterface(
                offset,
                party,
                ''
            )
            return r
        }

        const filter = this.buildActiveContractFilter(options)
        this.logger.debug('falling back to post request')

        return await this.postWithRetry(
            '/v2/state/active-contracts',
            filter,
            defaultRetryableOptions,
            {
                query: limit ? { limit: limit.toString() } : {},
            }
        )
    }

    private buildActiveContractFilter(options: {
        offset: number
        templateIds?: string[]
        parties?: string[] //TODO: Figure out if this should use this.partyId by default and not allow cross party filtering
        filterByParty?: boolean
        interfaceIds?: string[]
        limit?: number
    }) {
        const filter: PostRequest<'/v2/state/active-contracts'> = {
            filter: {
                filtersByParty: {},
            },
            verbose: false,
            activeAtOffset: options?.offset,
        }

        // Helper to build TemplateFilter array
        const buildTemplateFilter = (templateIds?: string[]) => {
            if (!templateIds) return []
            return [
                {
                    identifierFilter: {
                        TemplateFilter: {
                            value: {
                                templateId: templateIds[0],
                                includeCreatedEventBlob: true, //TODO: figure out if this should be configurable
                            },
                        },
                    },
                },
            ]
        }

        const buildInterfaceFilter = (interfaceIds?: string[]) => {
            if (!interfaceIds) return []
            return [
                {
                    identifierFilter: {
                        InterfaceFilter: {
                            value: {
                                interfaceId: interfaceIds[0],
                                includeCreatedEventBlob: true, //TODO: figure out if this should be configurable
                                includeInterfaceView: true,
                            },
                        },
                    },
                },
            ]
        }

        this.logger.info(options, 'active contract query options')
        if (
            options?.filterByParty &&
            options.parties &&
            options.parties.length > 0
        ) {
            // Filter by party: set filtersByParty for each party
            if (options?.templateIds && !options?.interfaceIds) {
                for (const party of options.parties) {
                    filter.filter!.filtersByParty[party] = {
                        cumulative: options.templateIds
                            ? buildTemplateFilter(options.templateIds)
                            : [],
                    }
                }
            } else if (options?.interfaceIds && !options?.templateIds) {
                for (const party of options.parties) {
                    filter.filter!.filtersByParty[party] = {
                        cumulative: options.interfaceIds
                            ? buildInterfaceFilter(options.interfaceIds)
                            : [],
                    }
                }
            }
        } else if (options?.templateIds) {
            // Only template filter, no party
            filter.filter!.filtersForAnyParty = {
                cumulative: buildTemplateFilter(options.templateIds),
            }
        } else if (options?.interfaceIds) {
            filter.filter!.filtersForAnyParty = {
                cumulative: buildInterfaceFilter(options.templateIds),
            }
        }

        return filter
    }

    // Retrieve an (arbitrary) synchronizer id from the validator.
    // This synchronizer id is cached for the remainder of this object's life.
    public async getSynchronizerId(): Promise<string> {
        if (this.synchronizerId) return this.synchronizerId
        const response = await this.getWithRetry(
            '/v2/state/connected-synchronizers'
        )
        if (!response.connectedSynchronizers?.[0]) {
            throw new Error('No connected synchronizers found')
        }
        const synchronizerId = response.connectedSynchronizers[0].synchronizerId
        if (response.connectedSynchronizers.length > 1) {
            this.logger.warn(
                `Found ${response.connectedSynchronizers.length} synchronizers, defaulting to ${synchronizerId}`
            )
        }
        this.synchronizerId = synchronizerId
        return synchronizerId
    }

    public async postWithRetry<Path extends PostEndpoint>(
        path: Path,
        body: PostRequest<Path>,
        retryOptions: retryableOptions = defaultRetryableOptions,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        },
        additionalOptions?: ExtraPostOpts
    ): Promise<PostResponse<Path>> {
        return await retryable(
            () => this.post(path, body, params, additionalOptions),
            retryOptions,
            this.logger
        ).catch((e) => {
            throw asJsCantonError(e)
        })
    }

    public async getWithRetry<Path extends GetEndpoint>(
        path: Path,
        retryOptions: retryableOptions = defaultRetryableOptions,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<GetResponse<Path>> {
        return await retryable(
            () => this.get(path, params),
            retryOptions,
            this.logger
        ).catch((e) => {
            throw asJsCantonError(e)
        })
    }

    public getCacheStats() {
        return this.acsHelper.getCacheStats()
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
