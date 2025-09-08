// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Types,
    LedgerClient,
    TokenStandardService,
} from '@canton-network/core-ledger-client'
import { pino } from 'pino'
import {
    PrettyTransactions,
    PrettyContract,
    ViewValue,
} from '@canton-network/core-ledger-client'
import { HoldingV1 } from '@canton-network/core-token-standard'

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
    private partyId: string = ''
    private synchronizerId: string = ''
    private transferFactoryRegistryUrl: string = ''

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param accessToken the access token from the user, usually provided by an auth controller.
     */
    constructor(
        userId: string,
        baseUrl: string,
        private accessToken: string
    ) {
        this.client = new LedgerClient(baseUrl, accessToken, this.logger)
        this.service = new TokenStandardService(this.client, this.logger)
        this.userId = userId
        return this
    }

    /**
     * Sets the party that the TokenStandardController will use for requests.
     * @param partyId
     */
    setPartyId(partyId: string): TokenStandardController {
        this.partyId = partyId
        return this
    }

    /**
     * Sets the synchronizerId that the TokenStandardController will use for requests.
     * @param synchronizerId
     */
    setSynchronizerId(synchronizerId: string): TokenStandardController {
        this.synchronizerId = synchronizerId
        return this
    }

    /**
     * Sets the transferFactoryRegistryUrl that the TokenStandardController will use for requests.
     * @param transferFactoryRegistryUrl
     */
    setTransferFactoryRegistryUrl(
        transferFactoryRegistryUrl: string
    ): TokenStandardController {
        this.transferFactoryRegistryUrl = transferFactoryRegistryUrl
        return this
    }

    async GetInstrumentAdmin(): Promise<string | undefined> {
        return await this.service.GetInstrumentAdmin(
            this.transferFactoryRegistryUrl
        )
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
            this.partyId,
            afterOffset,
            beforeOffset
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
            this.partyId
        )
    }

    /**
     * Lists all holding UTXOs for the current party.
     * @returns A promise that resolves to an array of holding UTXOs.
     */
    async listHoldingUtxos(): Promise<PrettyContract<HoldingV1.HoldingView>[]> {
        return await this.service.listContractsByInterface<HoldingV1.HoldingView>(
            '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
            this.partyId
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
        receiver: string,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: string
        }
    ): Promise<[Types['ExerciseCommand'], Types['DisclosedContract'][]]> {
        return this.service.createTap(
            receiver,
            amount,
            instrument.instrumentAdmin,
            instrument.instrumentId,
            this.transferFactoryRegistryUrl
        )
    }

    /**
     * Creates a new transfer for the specified sender, receiver, amount, and instrument.
     * @param sender The party of the sender.
     * @param receiver The party of the receiver.
     * @param amount The amount to be transferred.
     * @param instrument The instrument to be used for the transfer.
     * @param meta Optional metadata to include with the transfer.
     * @returns A promise that resolves to the ExerciseCommand which creates the transfer.
     */
    async createTransfer(
        sender: string,
        receiver: string,
        amount: string,
        instrument: {
            instrumentId: string
            instrumentAdmin: string
        },
        meta?: Record<string, never>
    ): Promise<[Types['ExerciseCommand'], Types['DisclosedContract'][]]> {
        try {
            return await this.service.createTransfer(
                sender,
                receiver,
                amount,
                instrument.instrumentAdmin,
                instrument.instrumentId,
                this.transferFactoryRegistryUrl,
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
                    this.transferFactoryRegistryUrl
                )
            } else {
                return await this.service.createRejectTransferInstruction(
                    transferInstructionCid,
                    this.transferFactoryRegistryUrl
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
    return new TokenStandardController(userId, 'http://127.0.0.1:5003', token)
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetTokenStandardDefault = (
    userId: string,
    token: string
): TokenStandardController => {
    return new TokenStandardController(userId, 'http://127.0.0.1:2975', token)
}
