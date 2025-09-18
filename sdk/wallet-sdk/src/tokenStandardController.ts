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
} from '@canton-network/core-ledger-client'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { pino } from 'pino'
import {
    HOLDING_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
} from '@canton-network/core-token-standard'
import { PartyId } from '@canton-network/core-types'

export type TransactionInstructionChoice = 'Accept' | 'Reject'

/**
 * TokenStandardController handles token standard management tasks.
 * This controller requires a userId and token.
 */
export class TokenStandardController {
    private logger = pino({ name: 'TokenStandardController', level: 'info' })
    private client: LedgerClient
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
     */
    constructor(
        userId: string,
        baseUrl: URL,
        validatorBaseUrl: URL,
        accessToken: string
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
            accessToken
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
                'transferFactoryRegistryUrl is not defined, called setTransferFactoryRegistryUrl'
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
     * Fetches all 2-step transfer pending either accept or reject.
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
    ): Promise<[Types['ExerciseCommand'], Types['DisclosedContract'][]]> {
        return this.service.createTap(
            receiver,
            amount,
            instrument.instrumentAdmin,
            instrument.instrumentId,
            this.getTransferFactoryRegistryUrl().href
        )
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
    ): Promise<[Types['ExerciseCommand'], Types['DisclosedContract'][]]> {
        try {
            return await this.service.createTransfer(
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
        } catch (error) {
            this.logger.error({ error }, 'Failed to create transfer')
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
    ): Promise<[Types['ExerciseCommand'], Types['DisclosedContract'][]]> {
        try {
            if (instructionChoice === 'Accept') {
                return await this.service.createAcceptTransferInstruction(
                    transferInstructionCid,
                    this.getTransferFactoryRegistryUrl().href
                )
            } else {
                return await this.service.createRejectTransferInstruction(
                    transferInstructionCid,
                    this.getTransferFactoryRegistryUrl().href
                )
            }
        } catch (error) {
            this.logger.error(
                { error },
                'Failed to accept transfer instruction'
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
    return new TokenStandardController(
        userId,
        new URL('http://127.0.0.1:2975'),
        new URL('http://wallet.localhost:2000/api/validator'),
        token
    )
}
