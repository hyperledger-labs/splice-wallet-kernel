// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Types,
    LedgerClient,
    PrettyTransactions,
    PrettyContract,
    ViewValue,
    TokenStandardService,
    Transaction,
    TransferInstructionView,
    Holding,
    ExerciseCommand,
    DisclosedContract,
} from '@canton-network/core-ledger-client'
import { ScanProxyClient } from '@canton-network/core-splice-client'

import { pino } from 'pino'
import { v4 } from 'uuid'
import {
    HOLDING_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
    AllocationSpecification,
    AllocationRequestView,
    AllocationInstructionView,
    AllocationView,
    Metadata,
    transferInstructionRegistryTypes,
    allocationInstructionRegistryTypes,
    Beneficiaries,
} from '@canton-network/core-token-standard'
import { AccessTokenProvider, PartyId } from '@canton-network/core-types'
import { WrappedCommand } from './ledgerController.js'

export type TransactionInstructionChoice = 'Accept' | 'Reject' | 'Withdraw'
export type AllocationInstructionChoice = 'Withdraw'
export type AllocationChoice = 'ExecuteTransfer' | 'Withdraw' | 'Cancel'
export type AllocationRequestChoice = 'Reject' | 'Withdraw'

export type FeaturedAppRight = {
    template_id: string
    contract_id: string
    payload: Record<string, never>
    created_event_blob: string
    created_at: string
}

/**
 * TokenStandardController handles token standard management tasks.
 * This controller requires a userId and token.
 */
export class TokenStandardController {
    private logger = pino({ name: 'TokenStandardController', level: 'info' })
    private readonly client: LedgerClient
    private service: TokenStandardService
    private userId: string
    private partyId: PartyId | undefined
    private synchronizerId: PartyId | undefined
    private transferFactoryRegistryUrl: URL | undefined
    private readonly accessTokenProvider: AccessTokenProvider

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param validatorBaseUrl the url for the validator api. Needed for Scan Proxy API access.
     * @param accessToken the access token from the user, usually provided by an auth controller.
     * @param isMasterUser if true, the transaction parser will interperate as if it has ReadAsAnyParty.
     */
    constructor(
        userId: string,
        baseUrl: URL,
        validatorBaseUrl: URL,
        accessTokenProvider: AccessTokenProvider,
        private isMasterUser: boolean = false
    ) {
        this.accessTokenProvider = accessTokenProvider
        this.client = new LedgerClient(
            baseUrl,
            this.logger,
            undefined,
            this.accessTokenProvider
        )
        const scanProxyClient = new ScanProxyClient(
            validatorBaseUrl,
            this.logger,
            this.accessTokenProvider
        )
        this.service = new TokenStandardService(
            this.client,
            scanProxyClient,
            this.logger,
            this.accessTokenProvider,
            isMasterUser
        )
        this.userId = userId
    }

    /**
     * Sets the party that the TokenStandardController will use for requests.
     * @param partyId
     */
    setPartyId(partyId: PartyId): TokenStandardController {
        this.partyId = partyId
        return this
    }

    /**
     * Sets the synchronizerId that the TokenStandardController will use for requests.
     * @param synchronizerId
     */
    setSynchronizerId(synchronizerId: PartyId): TokenStandardController {
        this.synchronizerId = synchronizerId
        return this
    }

    /**
     * Sets the transferFactoryRegistryUrl that the TokenStandardController will use for requests.
     * @param transferFactoryRegistryUrl
     */
    setTransferFactoryRegistryUrl(
        transferFactoryRegistryUrl: URL
    ): TokenStandardController {
        this.transferFactoryRegistryUrl = transferFactoryRegistryUrl
        return this
    }

    /**
     *  Gets the party Id or throws an error if it has not been set yet
     *  @returns partyId
     */
    getPartyId(): PartyId {
        if (!this.partyId)
            throw new Error('PartyId is not defined, call setPartyId')
        else return this.partyId
    }

    /**
     *  Gets the synchronizer Id or throws an error if it has not been set yet
     *  @returns partyId
     */
    getSynchronizerId(): PartyId {
        if (!this.synchronizerId)
            throw new Error(
                'synchronizer Id is not defined, call setSynchronizerId'
            )
        else return this.synchronizerId
    }

    /**
     *  Gets the transferFactoryRegistryUrl that the TokenStandardController uses for requests.
     */
    getTransferFactoryRegistryUrl(): URL {
        if (!this.transferFactoryRegistryUrl)
            throw new Error(
                'transferFactoryRegistryUrl is not defined, call setTransferFactoryRegistryUrl'
            )
        else return this.transferFactoryRegistryUrl
    }

    async getInstrumentAdmin(): Promise<PartyId | undefined> {
        const instrumentAdmin: string | undefined =
            await this.service.getInstrumentAdmin(
                this.getTransferFactoryRegistryUrl().href
            )
        if (instrumentAdmin) return instrumentAdmin as PartyId
        else return undefined
    }

    /** Lists all holdings for the current party.
     * @param afterOffset optional ledger offset to start from.
     * @param beforeOffset optional ledger offset to end at.
     * @returns A promise that resolves to an array of holdings.
     */
    async listHoldingTransactions(
        afterOffset?: string,
        beforeOffset?: string
    ): Promise<PrettyTransactions> {
        return await this.service.listHoldingTransactions(
            this.getPartyId(),
            afterOffset,
            beforeOffset
        )
    }
    /** Lists all holdings for the current party.
     * @param updateId id of queried transaction
     * @returns A promise that resolves to a transaction
     */
    async getTransactionById(updateId: string): Promise<Transaction> {
        return await this.service.getTransactionById(
            updateId,
            this.getPartyId()
        )
    }

    /** Lists all active contracts' interface view values and cids,
     *  filtered by an interface for the current party.
     * @param interfaceId id of queried interface.
     * @returns A promise that resolves to an array of
     *  active contracts interface view values and cids.
     */
    async listContractsByInterface<T = ViewValue>(
        interfaceId: string
    ): Promise<PrettyContract<T>[]> {
        return await this.service.listContractsByInterface<T>(
            interfaceId,
            this.getPartyId()
        )
    }

    /**
     * Lists all holding UTXOs for the current party.
     * @param includeLocked defaulted to true, this will include locked UTXOs.
     * @returns A promise that resolves to an array of holding UTXOs.
     */

    async listHoldingUtxos(
        includeLocked: boolean = true
    ): Promise<PrettyContract<Holding>[]> {
        const utxos = await this.service.listContractsByInterface<Holding>(
            HOLDING_INTERFACE_ID,
            this.getPartyId()
        )
        const currentTime = new Date()

        if (includeLocked) {
            return utxos
        } else {
            return utxos.filter((utxo) => {
                const lock = utxo.interfaceViewValue.lock
                if (!lock) return true

                const expiresAt = lock.expiresAt
                if (!expiresAt) return false

                const expiresAtDate = new Date(expiresAt)
                return expiresAtDate <= currentTime
            })
        }
    }

    /**
     * List specific holding utxo
     * @param contractId id of the holding UTXO
     * @throws error if the holding with the specified contractId is not found
     * @returns A promise that resolves to the holding UTXO.
     */
    async listHoldingUtxo(
        contractId: string
    ): Promise<PrettyContract<Holding>> {
        const allHoldings = await this.listHoldingUtxos()

        const contract = allHoldings.find((tx) => tx.contractId === contractId)

        if (contract === undefined) {
            throw new Error(`Holding with contractId ${contractId} not found`)
        } else return contract
    }

    /**
     * Fetches all 2-step transfers pending accept, reject, or withdraw.
     * @returns a promise containing prettyContract for TransferInstructionView.
     */

    async fetchPendingTransferInstructionView(): Promise<
        PrettyContract<TransferInstructionView>[]
    > {
        return await this.service.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            this.getPartyId()
        )
    }

    /**
     * Fetches all pending allocation instructions
     * @returns a promise containing prettyContract for AllocationInstructionView.
     */

    async fetchPendingAllocationInstructionView(): Promise<
        PrettyContract<AllocationInstructionView>[]
    > {
        return await this.service.listContractsByInterface<AllocationInstructionView>(
            ALLOCATION_INSTRUCTION_INTERFACE_ID,
            this.getPartyId()
        )
    }

    /**
     * Fetches all pending allocation requests
     * @returns a promise containing prettyContract for AllocationRequestView.
     */
    async fetchPendingAllocationRequestView(): Promise<
        PrettyContract<AllocationRequestView>[]
    > {
        return await this.service.listContractsByInterface<AllocationRequestView>(
            ALLOCATION_REQUEST_INTERFACE_ID,
            this.getPartyId()
        )
    }

    /**
     * Fetches all allocations pending execute_transfer, cancel, or withdraw
     * @returns a promise containing prettyContract for AllocationView.
     */

    async fetchPendingAllocationView(): Promise<
        PrettyContract<AllocationView>[]
    > {
        return await this.service.listContractsByInterface<AllocationView>(
            ALLOCATION_INTERFACE_ID,
            this.getPartyId()
        )
    }

    // TODO(#583) TransferPreapproval methods could be moved to SpliceController
    /**  Lookup a TransferPreapproval by the receiver party
     * @param receiverId receiver party id
     * @param instrumentId the instrument partyId that has transfer preapproval
     * @returns object with receiverId, dso, expiresAt, contractId, templateId, or `undefined` on error
     */
    async getTransferPreApprovalByParty(
        receiverId: PartyId,
        instrumentId: string
    ): Promise<
        | {
              receiverId: PartyId
              expiresAt: Date
              dso: PartyId
              contractId: string
              templateId: string
          }
        | undefined
    > {
        try {
            await this.service.getInstrumentById(
                this.getTransferFactoryRegistryUrl().href,
                instrumentId
            )

            const transfer_preapproval =
                await this.service.getTransferPreApprovalByParty(receiverId)

            const { dso, expiresAt } = transfer_preapproval.contract.payload
            const contractId = transfer_preapproval?.contract?.contract_id
            const templateId = transfer_preapproval?.contract?.template_id

            return {
                receiverId: receiverId as PartyId,
                expiresAt: new Date(expiresAt),
                dso: dso as PartyId,
                contractId,
                templateId,
            }
        } catch (e) {
            this.logger.error(e)
            return undefined
        }
    }

    /**
     * Build an Exercise command to cancel a TransferPreapproval.
     *
     * @param contractId contract ID of the TransferPreapproval to cancel.
     * @param templateId template ID of the TransferPreapproval (may vary by package version).
     * @param actor Party executing the cancel choice (must be provider or receiver).
     * @returns A promise that resolves to the ExerciseCommand which cancels TransferPreapproval and any disclosed contracts
     */
    async createCancelTransferPreapproval(
        contractId: string,
        templateId: string,
        actor: PartyId
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        const [cancelCommand, disclosed] =
            await this.service.cancelTransferPreapproval(
                contractId,
                templateId,
                actor
            )
        return [{ ExerciseCommand: cancelCommand }, disclosed]
    }

    /**
     * Build an Exercise command to renew a TransferPreapproval.
     * @param contractId Contract ID of the TransferPreapproval to renew.
     * @param templateId Template ID of the TransferPreapproval (may vary by package version).
     * @param provider Provider party whose inputs will fund the renewal.
     * @param newExpiresAt Optional Date of expires at after renewal. If omitted, will default to 30 days.
     * @param inputUtxos Optional list of specific holding CIDs to use as inputs.
     * @returns A promise that resolves to the ExerciseCommand which renews TransferPreapproval and any disclosed contracts
     */
    async createRenewTransferPreapproval(
        contractId: string,
        templateId: string,
        provider: PartyId,
        newExpiresAt?: Date,
        inputUtxos?: string[]
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        const [renewCommand, disclosed] =
            await this.service.renewTransferPreapproval(
                contractId,
                templateId,
                provider,
                this.getSynchronizerId(),
                newExpiresAt,
                inputUtxos
            )
        return [{ ExerciseCommand: renewCommand }, disclosed]
    }

    /**
     * Wait for Scan Proxy to show a receiver's TransferPreapproval, or for its CID to change after renewal,
     * or for it to disappear after cancel.
     *
     * Why: right after renew or cancel, the ledger is up to date, but Scan Proxy can lag. Poll until the
     * preapproval appears (create), its CID changes (renew), or it disappears (cancel).
     *
     * Usage:
     *  - After create: call without oldCid.
     *  - After renew: pass oldCid.
     *  - After cancel: set expectGone = true.
     *
     * @param receiverId Receiver party id.
     * @param instrumentId Instrument id (for example, "Amulet").
     * @param options Optional settings.
     * @param options.oldCid Resolve only when CID differs from this value (post-renew).
     * @param options.expectGone Set true to resolve when no preapproval is returned (post-cancel).
     * @param options.intervalMs Poll interval in milliseconds. Default is 15000.
     * @param options.timeoutMs Maximum wait time in milliseconds. Default is 300000.
     * @returns Resolves with the preapproval (for create/renew) or void (for expectGone).
     * @throws If the timeout elapses before the condition is met.
     */
    async waitForPreapprovalFromScanProxy(
        receiverId: string,
        instrumentId: string,
        {
            oldCid,
            expectGone = false,
            intervalMs = 15_000,
            timeoutMs = 5 * 60_000,
        }: {
            oldCid?: string
            expectGone?: boolean
            intervalMs?: number
            timeoutMs?: number
        } = {}
    ) {
        const deadline = Date.now() + timeoutMs

        for (let attempt = 1; Date.now() < deadline; attempt++) {
            try {
                const preapproval = await this.getTransferPreApprovalByParty(
                    receiverId,
                    instrumentId
                )

                if (expectGone) {
                    if (!preapproval) {
                        this.logger.info(
                            { attempt },
                            'Preapproval is no longer visible'
                        )
                        return
                    }
                    this.logger.info(
                        { attempt, seenCid: preapproval.contractId },
                        'Preapproval still visible - polling again'
                    )
                } else if (preapproval) {
                    if (!oldCid) {
                        this.logger.info(
                            { attempt, seenCid: preapproval.contractId },
                            'Preapproval is visible'
                        )
                        return preapproval
                    }
                    if (
                        preapproval.contractId &&
                        preapproval.contractId !== oldCid
                    ) {
                        this.logger.info(
                            { attempt, oldCid, newCid: preapproval.contractId },
                            'Preapproval CID changed'
                        )
                        return preapproval
                    }
                    this.logger.info(
                        { attempt, seenCid: preapproval.contractId, oldCid },
                        'Preapproval visible but CID unchanged - polling again'
                    )
                } else {
                    this.logger.info(
                        { attempt },
                        'Preapproval not visible yet - polling again'
                    )
                }
            } catch (err) {
                this.logger.debug({ attempt, err }, 'Fetch failed - retrying')
            }

            await new Promise((resolve) => setTimeout(resolve, intervalMs))
        }

        const waitingForSubject = expectGone
            ? 'for preapproval to disappear'
            : oldCid
              ? `for preapproval CID to change from ${oldCid}`
              : 'for preapproval to appear'

        throw new Error(
            `Timed out after ${Math.floor(timeoutMs / 1000)}s waiting ${waitingForSubject}`
        )
    }

    /**
     * Creates a new tap for the specified receiver and amount.
     * @param receiver The party of the receiver.
     * @param amount The amount to be tapped.
     * @param instrument The instrument to be used for the tap.
     * @returns A promise that resolves to the ExerciseCommand which creates the tap.
     */
    async createTap(
        receiver: PartyId,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: PartyId
        }
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        const [tapCommand, disclosedContracts] = await this.service.createTap(
            receiver,
            amount,
            instrument.instrumentAdmin,
            instrument.instrumentId,
            this.getTransferFactoryRegistryUrl().href
        )

        return [{ ExerciseCommand: tapCommand }, disclosedContracts]
    }

    /**
     * Creates a new tap for the specified receiver and amount for an internal party.
     * This does not require external signing.
     * @param receiver The party of the receiver.
     * @param amount The amount to be tapped.
     * @param instrument The instrument to be used for the tap.
     * @returns An update id and completion offset.
     */
    async createAndSubmitTapInternal(
        receiver: PartyId,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: PartyId
        }
    ) {
        const [tapCommand, disclosedContracts] = await this.service.createTap(
            receiver,
            amount,
            instrument.instrumentAdmin,
            instrument.instrumentId,
            this.getTransferFactoryRegistryUrl().href
        )

        const request = {
            commands: [{ ExerciseCommand: tapCommand }],
            commandId: v4(),
            userId: this.userId,
            actAs: [this.getPartyId()],
            readAs: [],
            disclosedContracts: disclosedContracts || [],
            synchronizerId: this.getSynchronizerId(),
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        return await this.client.post('/v2/commands/submit-and-wait', request)
    }

    /**
     * Creates ExerciseCommand for granting featured app rights.
     * @returns AmuletRules_DevNet_FeatureApp command and disclosed contracts.
     */
    async selfGrantFeatureAppRights(): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        const [featuredAppCommand, disclosedContracts] =
            await this.service.selfGrantFeatureAppRight(
                this.getPartyId(),
                this.getSynchronizerId()
            )

        return [{ ExerciseCommand: featuredAppCommand }, disclosedContracts]
    }

    /**
     * Looks up if a party has FeaturedAppRight.
     * Has an in built retry and delay between attempts
     * @returns If defined, a contract of Daml template `Splice.Amulet.FeaturedAppRight`.
     */
    async lookupFeaturedApps(
        maxRetries = 10,
        delayMs = 5000
    ): Promise<FeaturedAppRight | undefined> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result = await this.service.getFeaturedAppsByParty(
                this.getPartyId()
            )

            if (
                result &&
                typeof result === 'object' &&
                Object.keys(result).length > 0
            ) {
                return result
            }
            this.logger.info(
                `lookup featured apps attempt ${attempt} returned undefined. retrying again...`
            )

            if (attempt < maxRetries) {
                await new Promise((res) => setTimeout(res, delayMs))
            }
        }

        return undefined
    }

    /**
     * Submits a command to grant feature app rights for an internal party such as the validator operator user
     * For external parties, use prepareSignAndExecuteTransaction in LedgerController
     * @returns A contract of Daml template `Splice.Amulet.FeaturedAppRight`.
     */
    async grantFeatureAppRightsForInternalParty() {
        const featuredAppRights = await this.lookupFeaturedApps(1, 1000)

        if (featuredAppRights) {
            return featuredAppRights
        }

        const [featuredAppCommand, disclosedContractsApp] =
            await this.selfGrantFeatureAppRights()

        const request = {
            commands: [featuredAppCommand],
            commandId: v4(),
            userId: this.userId,
            actAs: [this.getPartyId()],
            readAs: [],
            disclosedContracts: disclosedContractsApp || [],
            synchronizerId: this.getSynchronizerId(),
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        await this.client.post('/v2/commands/submit-and-wait', request)

        return this.lookupFeaturedApps(5, 1000)
    }

    /**
     * Creates a new transfer for the specified sender, receiver, amount, and instrument.
     * @param sender The party of the sender.
     * @param receiver The party of the receiver.
     * @param amount The amount to be transferred.
     * @param instrument The instrument to be used for the transfer.
     * @param inputUtxos The utxos to use for this transfer, if not defined it will auto-select.
     * @param memo The message for the receiver to identify the transaction.
     * @param expiryDate Optional Expiry Date, default is 24 hours.
     * @param meta Optional metadata to include with the transfer.
     * @param prefetchedRegistryChoiceContext Optional factory id + choice context to avoid a registry call.
     * @returns A promise that resolves to the ExerciseCommand which creates the transfer.
     */
    async createTransfer(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: PartyId
        },
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata,
        prefetchedRegistryChoiceContext?: {
            factoryId: string
            choiceContext: transferInstructionRegistryTypes['schemas']['ChoiceContext']
        }
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        try {
            const [transferCommand, disclosedContracts] =
                await this.service.transfer.createTransfer(
                    sender,
                    receiver,
                    amount,
                    instrument.instrumentAdmin,
                    instrument.instrumentId,
                    this.getTransferFactoryRegistryUrl().href,
                    inputUtxos,
                    memo,
                    expiryDate,
                    meta,
                    prefetchedRegistryChoiceContext
                )

            return [{ ExerciseCommand: transferCommand }, disclosedContracts]
        } catch (error) {
            this.logger.error({ error }, 'Failed to create transfer')
            throw error
        }
    }

    async exerciseTransferInstructionChoiceWithDelegate(
        transferInstructionCid: string,
        instructionChoice: TransactionInstructionChoice,
        proxyCid: string,
        featuredAppRightCid: string,
        beneficiaries: Beneficiaries[],
        featuredAppRight2: FeaturedAppRight
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        let ExerciseCommand: ExerciseCommand
        let disclosedContracts: DisclosedContract[]

        const featuredAppDisclosedContract = {
            templateId: featuredAppRight2.template_id,
            contractId: featuredAppRight2.contract_id,
            createdEventBlob: featuredAppRight2.created_event_blob!,
            synchronizerId: this.getSynchronizerId(),
        }

        try {
            switch (instructionChoice) {
                case 'Accept':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.transfer.exerciseDelegateProxyTransferInstructionAccept(
                            proxyCid,
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl(),
                            featuredAppRightCid,
                            beneficiaries
                        )
                    return [
                        { ExerciseCommand },
                        [featuredAppDisclosedContract, ...disclosedContracts],
                    ]
                case 'Reject':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.transfer.exerciseDelegateProxyTransferInstructionReject(
                            proxyCid,
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl(),
                            featuredAppRightCid,
                            beneficiaries
                        )
                    return [
                        { ExerciseCommand },
                        [featuredAppDisclosedContract, ...disclosedContracts],
                    ]
                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.transfer.exerciseDelegateProxyTransferInstructioWithdraw(
                            proxyCid,
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl(),
                            featuredAppRightCid,
                            beneficiaries
                        )

                    return [
                        { ExerciseCommand },
                        [featuredAppDisclosedContract, ...disclosedContracts],
                    ]
                default:
                    throw new Error('Unexpected transfer instruction choice')
            }
        } catch (error) {
            this.logger.error(
                { error },
                'Failed to exercise transfer instruction choice'
            )
            throw error
        }
    }

    /**
     * Builds and fetches the registry context for a transfer factory call.
     * Use this to prefetch context for offline signing.
     * @param sender The party of the sender.
     * @param receiver The party of the receiver.
     * @param amount The amount to be transferred.
     * @param instrument The instrument to be used for the transfer.
     * @param inputUtxos The utxos to use for this transfer, if not defined it will auto-select.
     * @param memo The message for the receiver to identify the transaction.
     * @param expiryDate Optional Expiry Date, default is 24 hours.
     * @param meta Optional metadata to include with the transfer.
     * @returns Transfer factory id + choice context from the registry.
     */
    async getCreateTransferContext(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: PartyId
        },
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata
    ): Promise<
        transferInstructionRegistryTypes['schemas']['TransferFactoryWithChoiceContext']
    > {
        try {
            const choiceArgs =
                await this.service.transfer.buildTransferChoiceArgs(
                    sender,
                    receiver,
                    amount,
                    instrument.instrumentAdmin,
                    instrument.instrumentId,
                    inputUtxos,
                    memo,
                    expiryDate,
                    meta
                )
            return this.service.transfer.fetchTransferFactoryChoiceContext(
                this.getTransferFactoryRegistryUrl().href,
                choiceArgs
            )
        } catch (error) {
            this.logger.error({ error }, 'Failed to create transfer')
            throw error
        }
    }

    /**
     * Creates a new transfer for the specified sender, receiver, amount, and instrument using a delegate proxy.
     * @param exchangeParty delegate interacting with token standard workflow
     * @param proxyCid contract id for the DelegateProxy contract created for the exchange party
     * @param featuredAppRightCid The featured app right contract of the provider
     * @param sender The party of the sender.
     * @param receiver The party of the receiver.
     * @param amount The amount to be transferred.
     * @param instrument The instrument to be used for the transfer.
     * @param inputUtxos The utxos to use for this transfer, if not defined it will auto-select.
     * @param memo The message for the receiver to identify the transaction.
     * @param expiryDate Optional Expiry Date, default is 24 hours.
     * @param meta Optional metadata to include with the transfer.
     * @returns A promise that resolves to the ExerciseCommand which creates the transfer.
     */
    async createTransferUsingDelegateProxy(
        proxyCid: string,
        featuredAppRightCid: string,
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentId: string,
        instrumentAdmin: PartyId,
        beneficiaries: Beneficiaries[],
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        const [exercise, disclosedContracts] =
            await this.service.createDelegateProxyTranfser(
                sender,
                receiver,
                amount,
                instrumentAdmin,
                instrumentId,
                this.getTransferFactoryRegistryUrl().href,
                featuredAppRightCid,
                proxyCid,
                beneficiaries,
                inputUtxos,
                memo,
                expiryDate,
                meta
            )
        return [{ ExerciseCommand: exercise }, disclosedContracts]
    }

    /**
     * Creates an allocation instruction (optionally using pre-fetched registry choice context)
     * @param allocationSpecification Allocation specification to request
     * @param expectedAdmin Expected registry admin
     * @param inputUtxos Optional specific UTXOs to consume; auto-selected if omitted
     * @param requestedAt Optional request timestamp (ISO string)
     * @param prefetchedRegistryChoiceContext Optional factory id + choice context to avoid a registry call
     * @returns Wrapped ExerciseCommand and disclosed contracts for submission
     */
    async createAllocationInstruction(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        inputUtxos?: string[],
        requestedAt?: string,
        prefetchedRegistryChoiceContext?: {
            factoryId: string
            choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
        }
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        try {
            const [exercise, disclosed] =
                await this.service.allocation.createAllocationInstruction(
                    allocationSpecification,
                    expectedAdmin,
                    this.getTransferFactoryRegistryUrl().href,
                    inputUtxos,
                    requestedAt,
                    prefetchedRegistryChoiceContext
                )

            return [{ ExerciseCommand: exercise }, disclosed]
        } catch (error) {
            this.logger.error(
                { error },
                'Failed to create allocation instruction'
            )
            throw error
        }
    }

    /**
     * Builds and fetches the registry context for an allocation factory call
     * Use this to prefetch context for offline signing
     * @param allocationSpecification Allocation specification to request
     * @param expectedAdmin Expected registry admin
     * @param inputUtxos Optional specific UTXOs to consume; auto-selected if omitted
     * @param requestedAt Optional request timestamp (ISO string)
     * @returns Allocation factory id + choice context from the registry
     */
    async getCreateAllocationInstructionContext(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        inputUtxos?: string[],
        requestedAt?: string
    ): Promise<
        allocationInstructionRegistryTypes['schemas']['FactoryWithChoiceContext']
    > {
        try {
            const choiceArgs =
                await this.service.allocation.buildAllocationFactoryChoiceArgs(
                    allocationSpecification,
                    expectedAdmin,
                    inputUtxos,
                    requestedAt
                )
            return this.service.allocation.fetchAllocationFactoryChoiceContext(
                this.getTransferFactoryRegistryUrl().href,
                choiceArgs
            )
        } catch (error) {
            this.logger.error(
                { error },
                'Failed to fetch allocation factory context'
            )
            throw error
        }
    }

    /** Execute the choice TransferInstruction_Accept or TransferInstruction_Reject
     *  on the provided transfer instruction.
     * @param transferInstructionCid The contract ID of the transfer instruction to accept or reject
     * @param instructionChoice 'Accept' | 'Reject' | 'Withdraw'
     * @param prefetchedRegistryChoiceContext Optional choice context for offline signing.
     * @returns Wrapped ExerciseCommand and disclosed contracts for submission.
     */

    async exerciseTransferInstructionChoice(
        transferInstructionCid: string,
        instructionChoice: TransactionInstructionChoice,
        prefetchedRegistryChoiceContext?: {
            choiceContext: transferInstructionRegistryTypes['schemas']['ChoiceContext']
        }
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        let ExerciseCommand: ExerciseCommand
        let disclosedContracts: DisclosedContract[]
        try {
            switch (instructionChoice) {
                case 'Accept':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.transfer.createAcceptTransferInstruction(
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl().href,
                            prefetchedRegistryChoiceContext?.choiceContext
                        )
                    return [{ ExerciseCommand }, disclosedContracts]
                case 'Reject':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.transfer.createRejectTransferInstruction(
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl().href,
                            prefetchedRegistryChoiceContext?.choiceContext
                        )
                    return [{ ExerciseCommand }, disclosedContracts]
                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.transfer.createWithdrawTransferInstruction(
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl().href,
                            prefetchedRegistryChoiceContext?.choiceContext
                        )

                    return [{ ExerciseCommand }, disclosedContracts]
                default:
                    throw new Error('Unexpected transfer instruction choice')
            }
        } catch (error) {
            this.logger.error(
                { error },
                'Failed to exercise transfer instruction choice'
            )
            throw error
        }
    }

    /**
     * Fetches registry choice context for TransferInstruction_Accept
     * @param transferInstructionCid TransferInstruction contract id
     * @returns TransferInstruction_Accept choice context from the registry
     */
    async getAcceptTransferInstructionContext(
        transferInstructionCid: string
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        return this.service.transfer.fetchAcceptTransferInstructionChoiceContext(
            transferInstructionCid,
            this.getTransferFactoryRegistryUrl().href
        )
    }

    /**
     * Fetches registry choice context for TransferInstruction_Reject
     * @param transferInstructionCid TransferInstruction contract id
     * @returns TransferInstruction_Reject choice context from the registry
     */
    async getRejectTransferInstructionContext(
        transferInstructionCid: string
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        return this.service.transfer.fetchRejectTransferInstructionChoiceContext(
            transferInstructionCid,
            this.getTransferFactoryRegistryUrl().href
        )
    }

    /**
     * Fetches registry choice context for TransferInstruction_Withdraw
     * @param transferInstructionCid TransferInstruction contract id
     * @returns TransferInstruction_Withdraw choice context from the registry
     */
    async getWithdrawTransferInstructionContext(
        transferInstructionCid: string
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        return this.service.transfer.fetchWithdrawTransferInstructionChoiceContext(
            transferInstructionCid,
            this.getTransferFactoryRegistryUrl().href
        )
    }

    /**
     * Executes Allocation choice on the provided Allocation
     * @param allocationCid Allocation contract ID
     * @param allocationChoice 'ExecuteTransfer' | 'Withdraw' | 'Cancel'
     * @param prefetchedRegistryChoiceContext Optional choice context for offline signing
     * @returns Wrapped ExerciseCommand and disclosed contracts
     */
    async exerciseAllocationChoice(
        allocationCid: string,
        allocationChoice: AllocationChoice,
        prefetchedRegistryChoiceContext?: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        let ExerciseCommand: ExerciseCommand
        let disclosedContracts: DisclosedContract[] = []
        try {
            switch (allocationChoice) {
                case 'ExecuteTransfer':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.allocation.createExecuteTransferAllocation(
                            allocationCid,
                            this.getTransferFactoryRegistryUrl().href,
                            prefetchedRegistryChoiceContext
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.allocation.createWithdrawAllocation(
                            allocationCid,
                            this.getTransferFactoryRegistryUrl().href,
                            prefetchedRegistryChoiceContext
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                case 'Cancel':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.allocation.createCancelAllocation(
                            allocationCid,
                            this.getTransferFactoryRegistryUrl().href,
                            prefetchedRegistryChoiceContext
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                default:
                    throw new Error('Unexpected allocation choice')
            }
        } catch (error) {
            this.logger.error({ error }, 'Failed to exercise allocation choice')
            throw error
        }
    }

    /**
     * Fetch choice context from registry for Allocation ExecuteTransfer
     * @param allocationCid Allocation contract id
     * @returns Allocation_ExecuteTransfer choice context from the registry
     */
    async getAllocationExecuteTransferChoiceContext(allocationCid: string) {
        return this.service.allocation.fetchExecuteTransferChoiceContext(
            allocationCid,
            this.getTransferFactoryRegistryUrl().href
        )
    }

    /**
     * Fetches registry choice context for Allocation_Withdraw
     * @param allocationCid Allocation contract id
     * @returns Allocation_Withdraw choice context from the registry
     */
    async getAllocationWithdrawChoiceContext(allocationCid: string) {
        return this.service.allocation.fetchWithdrawAllocationChoiceContext(
            allocationCid,
            this.getTransferFactoryRegistryUrl().href
        )
    }

    /**
     * Fetches registry choice context for Allocation_Cancel
     * @param allocationCid Allocation contract id
     * @returns Allocation_Cancel choice context from the registry
     */
    async getAllocationCancelChoiceContext(allocationCid: string) {
        return this.service.allocation.fetchCancelAllocationChoiceContext(
            allocationCid,
            this.getTransferFactoryRegistryUrl().href
        )
    }

    /**
     * Executes AllocationInstruction choice on the provided AllocationInstruction
     * @param allocationInstructionCid AllocationInstruction contract id
     * @param instructionChoice Only 'Withdraw' is supported
     * @returns Wrapped ExerciseCommand and disclosed contracts for submission
     */
    async exerciseAllocationInstructionChoice(
        allocationInstructionCid: string,
        instructionChoice: AllocationInstructionChoice
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        let ExerciseCommand: ExerciseCommand
        let disclosedContracts: DisclosedContract[] = []
        try {
            switch (instructionChoice) {
                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.allocation.createWithdrawAllocationInstruction(
                            allocationInstructionCid
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                default:
                    throw new Error('Unexpected allocation instruction choice')
            }
        } catch (error) {
            this.logger.error(
                { error },
                'Failed to exercise allocation instruction choice'
            )
            throw error
        }
    }

    /**
     * Executes AllocationRequest choice on the provided AllocationRequest
     * @param allocationRequestCid AllocationRequest contract id
     * @param requestChoice 'Reject' | 'Withdraw'
     * @param actor Actor party
     * @returns Wrapped ExerciseCommand and disclosed contracts for submission
     */
    async exerciseAllocationRequestChoice(
        allocationRequestCid: string,
        requestChoice: AllocationRequestChoice,
        actor: PartyId
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        let ExerciseCommand: ExerciseCommand
        let disclosedContracts: DisclosedContract[] = []
        try {
            switch (requestChoice) {
                case 'Reject':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.allocation.createRejectAllocationRequest(
                            allocationRequestCid,
                            actor
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.allocation.createWithdrawAllocationRequest(
                            allocationRequestCid
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                default:
                    throw new Error('Unexpected allocation request choice')
            }
        } catch (error) {
            this.logger.error(
                { error },
                'Failed to exercise allocation request choice'
            )
            throw error
        }
    }
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localTokenStandardDefault = (
    userId: string,
    accessTokenProvider: AccessTokenProvider
): TokenStandardController => {
    return new TokenStandardController(
        userId,
        new URL('http://127.0.0.1:5003'),
        new URL('http://wallet.localhost:2000/api/validator'),
        accessTokenProvider
    )
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetTokenStandardDefault = (
    userId: string,
    accessTokenProvider: AccessTokenProvider
): TokenStandardController => {
    return localNetTokenStandardAppUser(userId, accessTokenProvider)
}

export const localNetTokenStandardAppUser = (
    userId: string,
    accessTokenProvider: AccessTokenProvider
): TokenStandardController => {
    return new TokenStandardController(
        userId,
        new URL('http://127.0.0.1:2975'),
        new URL('http://wallet.localhost:2000/api/validator'),
        accessTokenProvider
    )
}

export const localNetTokenStandardAppProvider = (
    userId: string,
    accessTokenProvider: AccessTokenProvider
): TokenStandardController => {
    return new TokenStandardController(
        userId,
        new URL('http://127.0.0.1:3975'),
        new URL('http://wallet.localhost:3000/api/validator'),
        accessTokenProvider
    )
}
