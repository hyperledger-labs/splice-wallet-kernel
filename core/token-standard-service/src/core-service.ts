// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    TokenStandardClient,
    HOLDING_INTERFACE_ID,
    type HoldingView,
} from '@canton-network/core-token-standard'
import {
    type Account,
    TokenStandardClient as TokenStandardClientV2,
    type HoldingView as HoldingViewV2,
} from '@canton-network/core-token-standard-v2'
import type { Logger, PartyId } from '@canton-network/core-types'
import { ACSReader, type AcsOptions } from '@canton-network/core-acs-reader'
import {
    ensureInterfaceViewIsPresent,
    TransactionParser,
    type PrettyContract,
    renderTransaction,
    type ViewValue,
    type PrettyTransactions,
    type Transaction,
    type TransferObject,
    type JsActiveContract,
} from '@canton-network/core-tx-parser'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import type {
    AbstractLedgerProvider,
    Ops,
} from '@canton-network/core-provider-ledger'
import { Decimal } from 'decimal.js'
import type {
    ApiVersion,
    GenericTokenStandardClient,
    JsActiveContractEntryResponse,
    JsGetActiveContractsResponse,
    JsGetUpdateResponse,
    JsGetUpdatesResponse,
    JsTransaction,
    OffsetCheckpointUpdate,
    TransactionUpdate,
} from './types.js'
import { isApiVersion, TokenStandardService } from './token-standard-service.js'

export class CoreService {
    constructor(
        private ledgerProvider: AbstractLedgerProvider,
        private readonly logger: Logger,
        private accessTokenProvider: AccessTokenProvider,
        private readonly isMasterUser: boolean
    ) {}

    getTokenStandardClientWithVersion(
        registryUrl: URL,
        version: ApiVersion
    ): GenericTokenStandardClient {
        if (!isApiVersion(version)) {
            throw new Error(`Unsupported token standard api version.`)
        }

        return version === 'v2'
            ? new TokenStandardClientV2(
                  registryUrl.href,
                  this.logger,
                  this.accessTokenProvider
              )
            : new TokenStandardClient(
                  registryUrl.href,
                  this.logger,
                  this.accessTokenProvider
              )
    }

    getTokenStandardClient(registryUrl: URL): TokenStandardClient {
        return new TokenStandardClient(
            registryUrl.href,
            this.logger,
            this.accessTokenProvider
        )
    }

    getTokenStandardClientV2(registryUrl: URL): TokenStandardClientV2 {
        return new TokenStandardClientV2(
            registryUrl.href,
            this.logger,
            this.accessTokenProvider
        )
    }

    toBasicAccount(partyId: PartyId): Account {
        return {
            owner: partyId,
            provider: null,
            id: '',
        }
    }

    private isSameAccount(a: Account, b: Account) {
        return a.id === b.id && a.owner === b.owner && a.provider === b.provider
    }
    async getInputHoldingCidsForAccount(opts: {
        account: Account
        partyId?: PartyId
        instrumentAdmin: string
        instrumentId: string
        inputUtxos?: string[]
        amount?: Decimal
        limit?: number
        offset?: number
        continueUntilCompletion?: boolean
    }) {
        if (opts.inputUtxos?.length) return opts.inputUtxos

        const party = opts.partyId ?? opts.account.owner
        if (!party) throw new Error('No party to query as')

        const now = new Date()
        const holdings = (
            await this.listContractsByInterface<HoldingViewV2>(
                '#splice-api-token-holding-v2:Splice.Api.Token.HoldingV2:Holding',
                party,
                opts.limit,
                opts.offset,
                opts.continueUntilCompletion ?? false
            )
        ).filter(
            (h) =>
                h.interfaceViewValue.instrumentId.admin ===
                    opts.instrumentAdmin &&
                h.interfaceViewValue.instrumentId.id == opts.instrumentId &&
                this.isSameAccount(
                    opts.account,
                    h.interfaceViewValue.account
                ) &&
                !TokenStandardService.isHoldingLocked(h, now)
        )

        return opts.amount
            ? CoreService.getInputHoldingsCidsForAmount(opts.amount, holdings)
            : holdings.map((h) => h.contractId)
    }

    async getInputHoldingsCids(options: {
        sender: PartyId
        instrumentAdmin?: string
        instrumentId?: string
        inputUtxos?: string[]
        amount?: Decimal
        continueUntilCompletion?: boolean
    }) {
        const { sender, instrumentAdmin, instrumentId } = options
        const now = new Date()
        if (options.inputUtxos && options.inputUtxos.length > 0) {
            return options.inputUtxos
        }
        const senderHoldings = await this.listContractsByInterface<HoldingView>(
            HOLDING_INTERFACE_ID,
            sender,
            undefined,
            undefined,
            options.continueUntilCompletion
        )
        if (senderHoldings.length === 0) {
            throw new Error(
                "Sender has no holdings, so transfer can't be executed."
            )
        }

        const unlockedSenderHoldings = senderHoldings.filter(
            (utxo) => !TokenStandardService.isHoldingLocked(utxo, now)
        )

        if (unlockedSenderHoldings.length > 100) {
            this.logger.warn(`Sender has more than 100 unlocked utxos.`)
        }

        const unlockedHoldingsForInstrument =
            instrumentAdmin && instrumentId
                ? await CoreService.filterHoldingsByInstrument({
                      holdings: unlockedSenderHoldings,
                      instrumentAdmin,
                      instrumentId,
                  })
                : unlockedSenderHoldings

        if (options.amount) {
            return CoreService.getInputHoldingsCidsForAmount(
                options.amount,
                unlockedHoldingsForInstrument
            )
        } else {
            return unlockedHoldingsForInstrument.map((h) => h.contractId)
        }
    }

    static async filterHoldingsByInstrument(options: {
        holdings: PrettyContract<HoldingView>[]
        instrumentAdmin: string
        instrumentId: string
    }) {
        const { holdings, instrumentAdmin, instrumentId } = options
        return holdings.filter((utxo) => {
            return (
                utxo.interfaceViewValue.instrumentId.id === instrumentId &&
                utxo.interfaceViewValue.instrumentId.admin === instrumentAdmin
            )
        })
    }

    static async getInputHoldingsCidsForAmount(
        amount: Decimal,
        unlockedSenderHoldings:
            PrettyContract<HoldingView>[] | PrettyContract<HoldingViewV2>[]
    ) {
        //find holding that is the exact amount if possible
        const exactAmount = unlockedSenderHoldings.find((holding) =>
            new Decimal(holding.interfaceViewValue.amount).equals(amount)
        )

        if (exactAmount) {
            return [exactAmount.contractId]
        }

        //sort holdings from smallest to largest
        const sortedUnlockedSenderHoldings = unlockedSenderHoldings.toSorted(
            (a, b) =>
                new Decimal(a.interfaceViewValue.amount).comparedTo(
                    new Decimal(b.interfaceViewValue.amount)
                )
        )

        const largestHoldingAmount = sortedUnlockedSenderHoldings.pop()

        if (!largestHoldingAmount) {
            throw new Error(`Sender doesn't have any unlocked holdings`)
        }

        let currentSum = new Decimal(
            largestHoldingAmount.interfaceViewValue.amount
        )
        const cIds = [largestHoldingAmount.contractId]

        for (const h of sortedUnlockedSenderHoldings) {
            if (currentSum.greaterThanOrEqualTo(amount)) {
                break
            }

            const currentHoldingAmount = new Decimal(
                h.interfaceViewValue.amount
            )

            currentSum = currentSum.plus(currentHoldingAmount)
            cIds.push(h.contractId)
        }

        if (currentSum.lessThan(amount)) {
            throw new Error(
                `Sender doesn't have sufficient funds for this transfer. Missing amount: ${amount.minus(currentSum)}`
            )
        }

        if (cIds.length > 100) {
            throw new Error(
                `Exceeded the maximum of 100 utxos in 1 transaction`
            )
        }

        return cIds
    }

    async listContractsByInterface<T = ViewValue>(
        interfaceId: string,
        partyId?: PartyId,
        limit?: number,
        offset?: number,
        continueUntilCompletion?: boolean
    ): Promise<PrettyContract<T>[]> {
        try {
            const ledgerEnd =
                offset ??
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

            const options: AcsOptions = {
                offset: ledgerEnd,
                interfaceIds: [interfaceId],
                parties: [partyId!],
                filterByParty: true,
                continueUntilCompletion: Boolean(continueUntilCompletion),
            }

            if (limit !== undefined) {
                options.limit = limit
            }

            //TODO: based on the. provider design we can't pass in the continue to completion, so right now it's defaulted to true in the ledger provider. we need to figure out how to add an ACS functionality and ensure better composability
            this.logger.info(
                `continue to completion: ${Boolean(continueUntilCompletion)}`
            )

            const reader = new ACSReader(this.ledgerProvider)

            const acsResponses: JsGetActiveContractsResponse[] =
                (await reader.raw.read(
                    options
                ))! as JsGetActiveContractsResponse[]

            /*  This filters out responses with entries of:
                - JsEmpty
                - JsIncompleteAssigned
                - JsIncompleteUnassigned
                while leaving JsActiveContract.
                It works fine only with single synchronizer
                TODO (#353) add support for multiple synchronizers
             */
            const isActiveContractEntry = (
                acsResponse: JsGetActiveContractsResponse
            ): acsResponse is JsActiveContractEntryResponse =>
                acsResponse.contractEntry != null &&
                'JsActiveContract' in acsResponse.contractEntry &&
                acsResponse.contractEntry.JsActiveContract != null &&
                acsResponse.contractEntry.JsActiveContract.createdEvent != null

            const results: PrettyContract<T>[] = acsResponses
                .filter(isActiveContractEntry)
                .map((response) =>
                    this.toPrettyContract<T>(
                        interfaceId,
                        response as JsActiveContractEntryResponse,
                        ledgerEnd
                    )
                )
            return results
        } catch (err) {
            this.logger.error(
                `Failed to list contracts of interface ${interfaceId}`,
                err
            )
            throw err
        }
    }

    async toPrettyTransactions(
        updates: JsGetUpdatesResponse[],
        partyId: PartyId
    ): Promise<PrettyTransactions> {
        // Runtime filters that also let TS know which of OneOfs types to check against
        const isOffsetCheckpointUpdate = (
            updateResponse: JsGetUpdatesResponse
        ): updateResponse is OffsetCheckpointUpdate =>
            updateResponse.update != null &&
            'OffsetCheckpoint' in updateResponse.update

        const isTransactionUpdate = (
            updateResponse: JsGetUpdatesResponse
        ): updateResponse is TransactionUpdate =>
            updateResponse.update != null &&
            'Transaction' in updateResponse.update &&
            !!updateResponse.update.Transaction?.value

        const offsetCheckpoints: number[] = updates
            .filter(isOffsetCheckpointUpdate)
            .map(
                (update) =>
                    (update.update as OffsetCheckpointUpdate['update'])
                        .OffsetCheckpoint.value.offset
            )
        const latestCheckpointOffset =
            offsetCheckpoints.length > 0 ? Math.max(...offsetCheckpoints) : 0

        const transactions: Transaction[] = await Promise.all(
            updates
                // exclude OffsetCheckpoint, Reassignment, TopologyTransaction
                .filter(isTransactionUpdate)
                .map(async (update) => {
                    const txUpdate = update as TransactionUpdate
                    const tx = txUpdate.update.Transaction
                        .value as JsTransaction
                    const parser = new TransactionParser(
                        this.ledgerProvider,
                        tx,
                        partyId,
                        this.isMasterUser
                    )

                    return await parser.parseTransaction()
                })
        )

        const transactionOffsets = transactions
            .map((tx) => tx.offset)
            .filter((offset): offset is number => offset !== undefined)

        return {
            // OffsetCheckpoint can be anywhere... or not at all, maybe
            nextOffset: Math.max(
                latestCheckpointOffset,
                ...(transactionOffsets.length > 0 ? transactionOffsets : [0])
            ),
            transactions: transactions
                .filter((tx) => tx.events.length > 0)
                .map(renderTransaction),
        }
    }

    async toPrettyTransaction(
        getUpdateResponse: JsGetUpdateResponse,
        partyId: PartyId
    ): Promise<Transaction> {
        const tx = this.getTransactionFromUpdate(getUpdateResponse)
        const parser = new TransactionParser(
            this.ledgerProvider,
            tx,
            partyId,
            this.isMasterUser
        )
        const parsedTx = await parser.parseTransaction()
        return renderTransaction(parsedTx)
    }

    async toPrettyTransferObjects(
        getUpdateResponse: JsGetUpdateResponse,
        partyId: PartyId
    ): Promise<TransferObject[]> {
        const tx = this.getTransactionFromUpdate(getUpdateResponse)
        const parser = new TransactionParser(
            this.ledgerProvider,
            tx,
            partyId,
            this.isMasterUser
        )
        return await parser.parseTransferObjects()
    }

    private getTransactionFromUpdate(
        getUpdateResponse: JsGetUpdateResponse
    ): JsTransaction {
        const update = getUpdateResponse.update
        if (!update || !('Transaction' in update)) {
            throw new Error('Expected transaction update')
        }
        return update.Transaction.value
    }

    async toPrettyTransactionsPerParty(
        updates: JsGetUpdatesResponse[],
        parties: PartyId[]
    ): Promise<Map<PartyId, PrettyTransactions>> {
        const all = await Promise.all(
            parties.map(
                async (partyId): Promise<[PartyId, PrettyTransactions]> => [
                    partyId,
                    await this.toPrettyTransactions(updates, partyId),
                ]
            )
        )
        return new Map(all)
    }

    // returns object with JsActiveContract content
    // and contractId and interface view value extracted from it as separate fields for convenience
    toPrettyContract<T>(
        interfaceId: string,
        response: JsActiveContractEntryResponse,
        offset?: number
    ): PrettyContract<T> {
        const activeContract = response.contractEntry
            .JsActiveContract as JsActiveContract
        const { createdEvent } = activeContract
        return {
            contractId: createdEvent.contractId,
            activeContract,
            interfaceViewValue: ensureInterfaceViewIsPresent(
                createdEvent,
                interfaceId
            ).viewValue as T,
            fetchedAtOffset: offset,
        }
    }

    toQualifiedMemberId(memberId: string) {
        if (!memberId) throw new Error('memberId is required')

        return /^(PAR|MED)::/.test(memberId) ? memberId : `PAR::${memberId}`
    }
}
