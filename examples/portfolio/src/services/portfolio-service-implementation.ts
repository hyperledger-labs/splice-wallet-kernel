// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid'
import { PartyId } from '@canton-network/core-types'
import {
    type Holding,
    type TransferInstructionView,
} from '@canton-network/core-ledger-client'
import {
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    HOLDING_INTERFACE_ID,
} from '@canton-network/core-token-standard'
import {
    resolveTokenStandardService,
    resolveTransactionHistoryService,
    resolveAmuletService,
    resolveTokenStandardClient,
} from './resolve.js'
import { type Transfer, toTransfer } from '../models/transfer.js'

// PortfolioService is a fat interface that tries to capture everything our
// portflio can do.  Separating the interface from the implementation will
// hopefully help us when we port the codebase to use web components instead
// of react.

export const listHoldings = async ({
    party,
}: {
    party: string
}): Promise<Holding[]> => {
    const tokenStandardService = await resolveTokenStandardService()

    // TODO: copy more from tokenStandardController
    const utxoContracts =
        await tokenStandardService.listContractsByInterface<Holding>(
            HOLDING_INTERFACE_ID,
            party
        )

    const uniqueContractIds = new Set<string>()
    const uniqueUtxos: Holding[] = []
    for (const utxo of utxoContracts) {
        if (!uniqueContractIds.has(utxo.contractId)) {
            uniqueContractIds.add(utxo.contractId)
            uniqueUtxos.push({
                ...utxo.interfaceViewValue,
                contractId: utxo.contractId,
            })
        }
    }

    return uniqueUtxos
}

export const createTransfer = async ({
    registryUrls,
    sender,
    receiver,
    instrumentId,
    amount,
    memo,
}: {
    registryUrls: Map<PartyId, string>
    sender: PartyId
    receiver: PartyId
    instrumentId: { admin: PartyId; id: string }
    amount: number
    memo?: string
}) => {
    const registryUrl = registryUrls.get(instrumentId.admin)
    if (!registryUrl)
        throw new Error(`no registry URL for admin ${instrumentId.admin}`)
    const tokenStandardService = await resolveTokenStandardService()

    const [transferCommand, disclosedContracts] =
        await tokenStandardService.transfer.createTransfer(
            sender,
            receiver,
            `${amount}`,
            instrumentId.admin,
            instrumentId.id,
            registryUrl,
            undefined, // inputUtxos
            memo,
            undefined, // expiryDate
            undefined, // Metadata
            undefined // prefetchedRegistryChoiceContext
        )

    const request = {
        commands: [{ ExerciseCommand: transferCommand }],
        commandId: v4(),
        actAs: [sender],
        disclosedContracts,
    }

    const provider = window.canton
    // TODO: check success
    await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
}

export const exerciseTransfer = async ({
    registryUrls,
    party,
    contractId,
    instrumentId,
    instructionChoice,
}: {
    registryUrls: Map<PartyId, string>
    party: PartyId
    contractId: string
    instrumentId: { admin: string; id: string }
    instructionChoice: 'Accept' | 'Reject' | 'Withdraw'
}) => {
    // TODO: resolve this BEFORE calling this function so we can gray out the
    // button?
    const registryUrl = registryUrls.get(instrumentId.admin)
    if (!registryUrl)
        throw new Error(`no registry URL for admin ${instrumentId.admin}`)

    const tokenStandardService = await resolveTokenStandardService()
    const [acceptCommand, disclosedContracts] =
        await tokenStandardService.transfer.createTransferInstruction(
            contractId,
            registryUrl,
            instructionChoice
        )

    const request = {
        commands: [{ ExerciseCommand: acceptCommand }],
        commandId: v4(),
        actAs: [party],
        disclosedContracts,
    }

    const provider = window.canton
    // TODO: check success
    await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
}

export const listPendingTransfers = async ({
    party,
}: {
    party: PartyId
}): Promise<Transfer[]> => {
    const tokenStandardService = await resolveTokenStandardService()
    const contracts =
        await tokenStandardService.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            party
        )
    return contracts.map((c) =>
        toTransfer({
            party,
            contractId: c.contractId,
            interfaceViewValue: c.interfaceViewValue,
        })
    )
}

export const getTransactionHistory = async ({
    party,
}: {
    party: PartyId
}): Promise<Transfer[]> => {
    const transactionHistoryService = await resolveTransactionHistoryService({
        party,
    })
    return transactionHistoryService.list()
}

export const fetchOlderTransactionHistory = async ({
    party,
}: {
    party: PartyId
}): Promise<Transfer[]> => {
    const transactionHistoryService = await resolveTransactionHistoryService({
        party,
    })
    return transactionHistoryService.fetchOlder()
}

export const fetchMoreRecentTransactionHistory = async ({
    party,
}: {
    party: PartyId
}): Promise<Transfer[]> => {
    const transactionHistoryService = await resolveTransactionHistoryService({
        party,
    })
    return transactionHistoryService.fetchMoreRecent()
}

export const tap = async ({
    party,
    sessionToken,
    amount,
}: {
    party: string
    sessionToken: string
    amount: number
}) => {
    // TODO: we'll need to retrieve all instrument info from the known
    // registries in order to allow the user to tap.
    const registryUrl = 'http://scan.localhost:4000'
    const tokenStandardClient = await resolveTokenStandardClient({
        registryUrl,
    })
    const amuletService = await resolveAmuletService({
        sessionToken,
    })
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const [tapCommand, disclosedContracts] = await amuletService.createTap(
        party,
        `${amount}`,
        registryInfo.adminId,
        'Amulet',
        registryUrl
    )

    const request = {
        commands: [{ ExerciseCommand: tapCommand }],
        commandId: v4(),
        actAs: [party],
        disclosedContracts,
    }

    const provider = window.canton
    // TODO: check success
    await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
}
