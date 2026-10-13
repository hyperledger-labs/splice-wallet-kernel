// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type HoldingView,
    type Metadata,
    FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
    type Beneficiaries,
} from '@canton-network/core-token-standard'
import type { HoldingView as HoldingViewV2 } from '@canton-network/core-token-standard-v2'
import { EventFilterBySetup } from '@canton-network/core-ledger-client-types'
import type { Logger, PartyId } from '@canton-network/core-types'
import {
    TokenStandardTransactionInterfaces,
    type PrettyContract,
    type ViewValue,
    type PrettyTransactions,
    type Transaction,
    type TransferObject,
} from '@canton-network/core-tx-parser'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import type {
    AbstractLedgerProvider,
    Ops,
} from '@canton-network/core-provider-ledger'
import type { Decimal } from 'decimal.js'
import {
    type ApiVersion,
    type AssetCapabilities,
    type DisclosedContract,
    type ExerciseCommand,
    type AssetBody,
    type JsGetUpdatesResponse,
    KEY_MAPPING,
    SUPPORTED_VERSIONS,
    type UpdateFormat,
} from './types.js'
import { TransferServiceV2 } from './v2/transfer-service.js'
import { TransferService } from './v1/transfer-service.js'
import { AllocationService } from './v1/allocation-service.js'
import { CoreService } from './core-service.js'
import { AllocationService as AllocationServiceV2 } from './v2/allocation-service.js'

export function isApiVersion(v: string): v is ApiVersion {
    return (SUPPORTED_VERSIONS as readonly string[]).includes(v)
}

export function resolveCapabilities(opts: {
    supportedApis: {
        [key: string]: number
    }
}): AssetCapabilities {
    const supportedApis = opts.supportedApis

    const resolvedCapabilities: AssetCapabilities = {
        holding: [],
        transferInstruction: [],
        allocation: [],
        allocationInstruction: [],
        allocationRequest: [],
    }

    for (const key of Object.keys(supportedApis)) {
        const match = key.match(
            /^splice-api-token-(?<capabilityName>.+)-(?<version>v\d+)$/
        )

        if (match?.groups) {
            const { capabilityName, version } = match.groups
            const targetKey = KEY_MAPPING[capabilityName]

            if (
                targetKey &&
                supportedApis[key] === 1 &&
                isApiVersion(version)
            ) {
                resolvedCapabilities[targetKey].push(version)
            }
        }
    }

    for (const key in resolvedCapabilities) {
        resolvedCapabilities[key as keyof AssetCapabilities].sort()
    }

    return resolvedCapabilities
}

export class TokenStandardService {
    static readonly MEMO_KEY = 'splice.lfdecentralizedtrust.org/reason'

    readonly core: CoreService
    readonly allocation: AllocationService
    readonly transfer: TransferService
    readonly v2: {
        readonly transfer: TransferServiceV2
        readonly allocation: AllocationServiceV2
    }

    constructor(
        private ledgerProvider: AbstractLedgerProvider,
        private logger: Logger,
        private accessTokenProvider: AccessTokenProvider,
        private readonly isMasterUser: boolean
    ) {
        this.core = new CoreService(
            ledgerProvider,
            logger,
            accessTokenProvider,
            isMasterUser
        )
        this.allocation = new AllocationService(this.core, this.logger)
        this.transfer = new TransferService(this.core, this.logger)
        this.v2 = {
            transfer: new TransferServiceV2(this.core, this.logger),
            allocation: new AllocationServiceV2(this.core, this.logger),
        }
    }

    async resolveCapabilitiesFromRegistryByInstrumentId(
        registryUrl: URL,
        instrumentId: string
    ): Promise<AssetCapabilities> {
        const metadataInfo = await this.getInstrumentById(
            registryUrl,
            instrumentId
        )
        return resolveCapabilities({
            supportedApis: metadataInfo.supportedApis,
        })
    }

    async getInstrumentById(registryUrl: URL, instrumentId: string) {
        try {
            const params: Record<string, unknown> = {
                path: {
                    instrumentId,
                },
            }

            const client = this.core.getTokenStandardClient(registryUrl)

            return await client.get(
                '/registry/metadata/v1/instruments/{instrumentId}',
                params
            )
        } catch (e) {
            this.logger.error(e)
            throw new Error(
                `Instrument id ${instrumentId} does not exist for this instrument admin.`,
                { cause: e }
            )
        }
    }

    async getInstrumentAdmin(registryUrl: URL): Promise<string> {
        const client = this.core.getTokenStandardClient(registryUrl)

        const info = await client.get('/registry/metadata/v1/info')

        return info.adminId
    }

    async listInstruments(
        registryUrl: URL,
        pageSize?: number,
        pageToken?: string
    ) {
        const client = this.core.getTokenStandardClient(registryUrl)
        return client.get('/registry/metadata/v1/instruments', {
            query: {
                ...(pageSize && { pageSize }),
                ...(pageToken && { pageToken }),
            },
        })
    }

    async instrumentsToAsset(registryUrl: URL): Promise<
        {
            id: string
            displayName: string
            symbol: string
            registryUrl: URL
            admin: PartyId
            capabilities: AssetCapabilities
        }[]
    > {
        let instrumentsResponse = await this.listInstruments(registryUrl)
        const instruments = [...instrumentsResponse.instruments]

        while (instrumentsResponse.nextPageToken) {
            instrumentsResponse = await this.listInstruments(
                registryUrl,
                undefined,
                instrumentsResponse.nextPageToken
            )
            instruments.push(...instrumentsResponse.instruments)
        }
        const instrumentAdmin = await this.getInstrumentAdmin(registryUrl)

        return instruments.map((instrument) => ({
            id: instrument.id,
            displayName: instrument.name,
            symbol: instrument.symbol,
            registryUrl,
            admin: instrumentAdmin,
            capabilities: resolveCapabilities({
                supportedApis: instrument.supportedApis,
            }),
        }))
    }

    async registriesToAssets(registryUrls: URL[]): Promise<AssetBody[]> {
        const allInstruments: {
            id: string
            displayName: string
            symbol: string
            registryUrl: URL
            admin: PartyId
            capabilities: AssetCapabilities
        }[] = []
        for (const registryUrl of registryUrls) {
            const instruments = await this.instrumentsToAsset(registryUrl)
            allInstruments.push(...instruments)
        }
        return allInstruments
    }

    // <T> is shape of viewValue related to queried interface.
    // i.e. when querying by TransferInstruction interfaceId, <T> would be TransferInstructionView from daml codegen
    async listContractsByInterface<T = ViewValue>(
        interfaceId: string,
        partyId?: PartyId,
        limit?: number,
        offset?: number,
        continueUntilCompletion?: boolean
    ): Promise<PrettyContract<T>[]> {
        return this.core.listContractsByInterface<T>(
            interfaceId,
            partyId,
            limit,
            offset,
            continueUntilCompletion
        )
    }

    async listHoldingTransactions(
        partyId: PartyId,
        afterOffset?: number,
        beforeOffset?: number
    ): Promise<PrettyTransactions> {
        try {
            this.logger.debug('Set or query offset')
            const afterOffsetOrLatest =
                afterOffset ??
                (
                    await this.ledgerProvider.request<Ops.GetV2StateLatestPrunedOffsets>(
                        {
                            method: 'ledgerApi',
                            params: {
                                resource: '/v2/state/latest-pruned-offsets',
                                requestMethod: 'get',
                            },
                        }
                    )
                ).participantPrunedUpToInclusive!
            const beforeOffsetOrLatest =
                beforeOffset ??
                (
                    await this.ledgerProvider.request<Ops.GetV2StateLedgerEnd>({
                        method: 'ledgerApi',
                        params: {
                            resource: '/v2/state/ledger-end',
                            requestMethod: 'get',
                            query: {},
                        },
                    })
                ).offset!

            this.logger.debug(afterOffsetOrLatest, 'Using offset')
            const updatesResponse: JsGetUpdatesResponse[] =
                await this.ledgerProvider.request<Ops.PostV2Updates>({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/updates',
                        requestMethod: 'post',
                        query: {},
                        body: {
                            updateFormat: {
                                includeTransactions: {
                                    eventFormat: EventFilterBySetup({
                                        interfaceIds:
                                            TokenStandardTransactionInterfaces,
                                        isMasterUser: this.isMasterUser,
                                        partyId: partyId,
                                        includeWildcard: true,
                                    }),
                                    transactionShape:
                                        'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                                },
                            },
                            beginExclusive: afterOffsetOrLatest,
                            endInclusive: beforeOffsetOrLatest,
                        },
                    },
                })

            return this.core.toPrettyTransactions(
                updatesResponse,
                partyId
                // this.ledgerProvider
            )
        } catch (err) {
            this.logger.error('Failed to list holding transactions.', err)
            throw err
        }
    }

    async getTransactionById(
        updateId: string,
        partyId: PartyId
    ): Promise<Transaction> {
        const updateFormat: UpdateFormat = {
            includeTransactions: {
                eventFormat: EventFilterBySetup({
                    interfaceIds: TokenStandardTransactionInterfaces,
                    isMasterUser: this.isMasterUser,
                    partyId: partyId,
                    includeWildcard: true,
                }),
                transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
            },
        }

        const getUpdateResponse =
            await this.ledgerProvider.request<Ops.PostV2UpdatesUpdateById>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/updates/update-by-id',
                    requestMethod: 'post',
                    body: {
                        updateId,
                        updateFormat,
                    },
                },
            })

        return this.core.toPrettyTransaction(getUpdateResponse, partyId)
    }

    async getTransferObjectsById(
        updateId: string,
        partyId: PartyId
    ): Promise<TransferObject[]> {
        const updateFormat: UpdateFormat = {
            includeTransactions: {
                eventFormat: EventFilterBySetup({
                    interfaceIds: TokenStandardTransactionInterfaces,
                    isMasterUser: this.isMasterUser,
                    partyId: partyId,
                    includeWildcard: true,
                }),
                transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
            },
        }

        const getUpdateResponse =
            await this.ledgerProvider.request<Ops.PostV2UpdatesUpdateById>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/updates/update-by-id',
                    requestMethod: 'post',
                    body: {
                        updateId,
                        updateFormat,
                    },
                },
            })

        return this.core.toPrettyTransferObjects(getUpdateResponse, partyId)
    }

    async getInputHoldingsCids(
        sender: PartyId,
        inputUtxos?: string[],
        amount?: Decimal
    ) {
        if (amount) {
            return this.core.getInputHoldingsCids({
                sender,
                inputUtxos: inputUtxos ?? [],
                amount,
            })
        } else {
            return this.core.getInputHoldingsCids({
                sender,
                inputUtxos: inputUtxos ?? [],
            })
        }
    }

    async createDelegateProxyTransfer(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId, // TODO (#907): replace with registry call
        instrumentId: string,
        registryUrl: URL,
        featuredAppRightCid: string,
        proxyCid: string,
        beneficiaries: Beneficiaries[],
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [transferCommand, disclosedContracts] =
            await this.transfer.createTransfer(
                sender,
                receiver,
                amount,
                instrumentAdmin,
                instrumentId,
                registryUrl,
                inputUtxos,
                memo,
                expiryDate,
                meta
            )

        const sumOfWeights: number = beneficiaries.reduce(
            (totalWeight, beneficiary) => totalWeight + beneficiary.weight,
            0
        )

        if (sumOfWeights > 1.0) {
            throw new Error('Sum of beneficiary weights is larger than 1.')
        }

        const choiceArgs = {
            cid: transferCommand.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries,
                choiceArg: transferCommand.choiceArgument,
            },
        }

        const exercise: ExerciseCommand = {
            templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
            contractId: proxyCid,
            choice: 'DelegateProxy_TransferFactory_Transfer',
            choiceArgument: choiceArgs,
        }

        return [exercise, disclosedContracts]
    }

    async exerciseDelegateProxyTransferInstructionAccept(
        exchangeParty: PartyId,
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: URL,
        featuredAppRightCid: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [acceptTransferInstructionContext, disclosedContracts] =
            await this.transfer.createAcceptTransferInstruction(
                transferInstructionCid,
                registryUrl
            )

        const choiceArgs = {
            cid: acceptTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries: [
                    {
                        beneficiary: exchangeParty,
                        weight: 1.0,
                    },
                ],
                choiceArg: acceptTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId:
                    '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Accept',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }

    static isHoldingLocked(
        holding: PrettyContract<HoldingView> | PrettyContract<HoldingViewV2>,
        currentTime: Date = new Date()
    ): boolean {
        const lock = holding.interfaceViewValue.lock
        if (!lock) return false

        let expiresAtAbsolute: Date | null = null
        let expiresAtRelative: Date | null = null

        if (lock.expiresAfter) {
            const createdAt = new Date(
                holding.activeContract.createdEvent.createdAt
            )

            // 1 microsecond = 0.001 milliseconds
            const msToAdd = parseInt(lock.expiresAfter.microseconds) / 1000

            expiresAtRelative = new Date(createdAt.getTime() + msToAdd)
        }
        if (lock.expiresAt) {
            expiresAtAbsolute = new Date(lock.expiresAt)
        }

        let expiresAt: Date

        // If both `expiresAt` and `expiresAfter` are set, the lock expires at the earlier of the two times.
        if (expiresAtRelative && expiresAtAbsolute) {
            expiresAt =
                expiresAtRelative < expiresAtAbsolute
                    ? expiresAtRelative
                    : expiresAtAbsolute
        } else if (expiresAtRelative) {
            expiresAt = expiresAtRelative
        } else if (expiresAtAbsolute) {
            expiresAt = expiresAtAbsolute
        } else {
            // No expiration => locked
            return true
        }

        return currentTime < expiresAt
    }
}
