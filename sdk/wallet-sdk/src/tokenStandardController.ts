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
    AllocationContextValue,
    AllocationRequestView,
    AllocationInstructionView,
    AllocationView,
} from '@canton-network/core-token-standard'
import { PartyId } from '@canton-network/core-types'
import { WrappedCommand } from './ledgerController.js'

export type TransactionInstructionChoice = 'Accept' | 'Reject' | 'Withdraw'
export type AllocationInstructionChoice = 'Withdraw'
export type AllocationChoice = 'ExecuteTransfer' | 'Withdraw' | 'Cancel'
export type AllocationRequestChoice = 'Reject' | 'Withdraw'

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
        accessToken: string,
        private isMasterUser: boolean = false
    ) {
        this.client = new LedgerClient(baseUrl, accessToken, this.logger)
        const scanProxyClient = new ScanProxyClient(
            validatorBaseUrl,
            this.logger,
            accessToken
        )
        this.service = new TokenStandardService(
            this.client,
            scanProxyClient,
            this.logger,
            accessToken,
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

    /**  Lookup a TransferPreapproval by the receiver party
     * @param receiverId receiver party id
     * @param instrumentId the instrument partyId that has transfer preapproval
     * @returns the receiverId, dso, and expiresAt
     */
    async getTransferPreApprovalByParty(
        receiverId: PartyId,
        instrumentId: string
    ): Promise<
        { receiverId: PartyId; expiresAt: Date; dso: PartyId } | undefined
    > {
        try {
            await this.service.getInstrumentById(
                this.getTransferFactoryRegistryUrl().href,
                instrumentId
            )

            const transfer_preapproval =
                await this.service.getTransferPreApprovalByParty(receiverId)

            const { dso, expiresAt } = transfer_preapproval.contract.payload
            return {
                receiverId: receiverId as PartyId,
                expiresAt: new Date(expiresAt),
                dso: dso as PartyId,
            }
        } catch (e) {
            this.logger.error(e)
            return undefined
        }
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
     * @returns If defined, a contract of Daml template `Splice.Amulet.FeaturedAppRight`.
     */
    async lookupFeaturedApps() {
        return this.service.getFeaturedAppsByParty(this.getPartyId())
    }

    /**
     * Submits a command to grant feature app rights for an internal party such as the validator operator user
     * For external parties, use prepareSignAndExecuteTransaction in LedgerController
     * @returns A contract of Daml template `Splice.Amulet.FeaturedAppRight`.
     */
    async grantFeatureAppRightsForInternalParty() {
        const featuredAppRights = await this.lookupFeaturedApps()

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

        return this.lookupFeaturedApps()
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
        meta?: Record<string, unknown>
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        try {
            const [transferCommand, disclosedContracts] =
                await this.service.createTransfer(
                    sender,
                    receiver,
                    amount,
                    instrument.instrumentAdmin,
                    instrument.instrumentId,
                    this.getTransferFactoryRegistryUrl().href,
                    inputUtxos,
                    memo,
                    expiryDate,
                    meta
                )

            return [{ ExerciseCommand: transferCommand }, disclosedContracts]
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
        exchangeParty: PartyId,
        proxyCid: string,
        featuredAppRightCid: string,
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentId: string,
        instrumentAdmin: PartyId,
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Record<string, unknown>
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        const [exercise, disclosedContracts] =
            await this.service.createDelegateProxyTranfser(
                sender,
                receiver,
                exchangeParty,
                amount,
                instrumentAdmin,
                instrumentId,
                this.getTransferFactoryRegistryUrl().href,
                featuredAppRightCid,
                proxyCid,
                inputUtxos,
                memo,
                expiryDate,
                meta
            )
        return [{ ExerciseCommand: exercise }, disclosedContracts]
    }

    async createAllocationInstruction(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        inputUtxos?: string[],
        requestedAt?: string,
        extraContext?: AllocationContextValue
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        try {
            const [exercise, disclosed] =
                await this.service.createAllocationInstruction(
                    allocationSpecification,
                    expectedAdmin,
                    this.getTransferFactoryRegistryUrl().href,
                    inputUtxos,
                    requestedAt,
                    extraContext
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

    /** Execute the choice TransferInstruction_Accept or TransferInstruction_Reject
     *  on the provided transfer instruction.
     * @param transferInstructionCid The contract ID of the transfer instruction to accept or reject
     * @param instructionChoice is either Accept or Reject
     * @returns A promise that resolves to an array of
     *  active contracts interface view values and cids.
     */

    async exerciseTransferInstructionChoice(
        transferInstructionCid: string,
        instructionChoice: TransactionInstructionChoice
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        let ExerciseCommand: ExerciseCommand
        let disclosedContracts: DisclosedContract[]
        try {
            switch (instructionChoice) {
                case 'Accept':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.createAcceptTransferInstruction(
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl().href
                        )
                    return [{ ExerciseCommand }, disclosedContracts]
                case 'Reject':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.createRejectTransferInstruction(
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl().href
                        )
                    return [{ ExerciseCommand }, disclosedContracts]
                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.createWithdrawTransferInstruction(
                            transferInstructionCid,
                            this.getTransferFactoryRegistryUrl().href
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
     * Execute Allocation choice on the provided Allocation.
     * @param allocationCid The Allocation contract ID.
     * @param allocationChoice 'ExecuteTransfer' | 'Withdraw' | 'Cancel'
     */
    async exerciseAllocationChoice(
        allocationCid: string,
        allocationChoice: AllocationChoice
    ): Promise<
        [WrappedCommand<'ExerciseCommand'>, Types['DisclosedContract'][]]
    > {
        let ExerciseCommand: ExerciseCommand
        let disclosedContracts: DisclosedContract[] = []
        try {
            switch (allocationChoice) {
                case 'ExecuteTransfer':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.createExecuteTransferAllocation(
                            allocationCid,
                            this.getTransferFactoryRegistryUrl().href
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.createWithdrawAllocation(
                            allocationCid,
                            this.getTransferFactoryRegistryUrl().href
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                case 'Cancel':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.createCancelAllocation(
                            allocationCid,
                            this.getTransferFactoryRegistryUrl().href
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
     * Fetch choice context from registry for Allocation ExecuteTransfer.
     * @param allocationCid The Allocation contract ID.
     */
    async getAllocationExecuteTransferChoiceContext(allocationCid: string) {
        return this.service.getAllocationExecuteTransferChoiceContext(
            allocationCid,
            this.getTransferFactoryRegistryUrl().href
        )
    }

    /**
     * Execute AllocationInstruction choice on the provided AllocationInstruction.
     * @param allocationInstructionCid The AllocationInstruction contract ID.
     * @param instructionChoice 'Withdraw'
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
                        await this.service.createWithdrawAllocationInstruction(
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
                        await this.service.createRejectAllocationRequest(
                            allocationRequestCid,
                            actor
                        )
                    return [{ ExerciseCommand }, disclosedContracts]

                case 'Withdraw':
                    ;[ExerciseCommand, disclosedContracts] =
                        await this.service.createWithdrawAllocationRequest(
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
    token: string
): TokenStandardController => {
    return new TokenStandardController(
        userId,
        new URL('http://127.0.0.1:5003'),
        new URL('http://wallet.localhost:2000/api/validator'),
        token
    )
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetTokenStandardDefault = (
    userId: string,
    token: string
): TokenStandardController => {
    return localNetTokenStandardAppUser(userId, token)
}

export const localNetTokenStandardAppUser = (
    userId: string,
    token: string
): TokenStandardController => {
    return new TokenStandardController(
        userId,
        new URL('http://127.0.0.1:2975'),
        new URL('http://wallet.localhost:2000/api/validator'),
        token
    )
}

export const localNetTokenStandardAppProvider = (
    userId: string,
    token: string
): TokenStandardController => {
    return new TokenStandardController(
        userId,
        new URL('http://127.0.0.1:3975'),
        new URL('http://wallet.localhost:3000/api/validator'),
        token
    )
}
