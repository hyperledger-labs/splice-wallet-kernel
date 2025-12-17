// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid'
import { PartyId } from '@canton-network/core-types'
import {
    type Holding,
    type TransferInstructionView,
    type PrettyContract,
} from '@canton-network/core-ledger-client'
import {
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
    HOLDING_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    type AllocationInstructionView,
    type AllocationRequestView,
    type AllocationSpecification,
    type AllocationView,
} from '@canton-network/core-token-standard'
import {
    resolveTokenStandardService,
    resolveTransactionHistoryService,
    resolveAmuletService,
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
    registryUrls: ReadonlyMap<PartyId, string>
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
    registryUrls: ReadonlyMap<PartyId, string>
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

export const createAllocationInstruction = async ({
    registryUrls,
    allocationSpecification,
}: {
    registryUrls: ReadonlyMap<PartyId, string>
    allocationSpecification: AllocationSpecification
}): Promise<void> => {
    const { instrumentId, sender } = allocationSpecification.transferLeg
    const registryUrl = registryUrls.get(instrumentId.admin)
    if (!registryUrl)
        throw new Error(`no registry URL for admin ${instrumentId.admin}`)
    const tokenStandardService = await resolveTokenStandardService()

    const [command, disclosedContracts] =
        await tokenStandardService.allocation.createAllocationInstruction(
            allocationSpecification,
            instrumentId.admin,
            registryUrl,
            undefined, // inputUtxos
            undefined // requestedAt
        )

    const request = {
        commands: [{ ExerciseCommand: command }],
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

export const listPendingAllocationInstructions = async ({
    party,
}: {
    party: PartyId
}): Promise<PrettyContract<AllocationInstructionView>[]> => {
    const tokenStandardService = await resolveTokenStandardService()
    const contracts =
        await tokenStandardService.listContractsByInterface<AllocationInstructionView>(
            ALLOCATION_INSTRUCTION_INTERFACE_ID,
            party
        )
    return contracts
}

export const listPendingAllocationRequests = async ({
    party,
}: {
    party: PartyId
}): Promise<PrettyContract<AllocationRequestView>[]> => {
    const tokenStandardService = await resolveTokenStandardService()
    const contracts =
        await tokenStandardService.listContractsByInterface<AllocationRequestView>(
            ALLOCATION_REQUEST_INTERFACE_ID,
            party
        )
    return contracts
}

export const listPendingAllocations = async ({
    party,
}: {
    party: PartyId
}): Promise<PrettyContract<AllocationView>[]> => {
    const tokenStandardService = await resolveTokenStandardService()
    const contracts =
        await tokenStandardService.listContractsByInterface<AllocationView>(
            ALLOCATION_INTERFACE_ID,
            party
        )
    return contracts
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
    registryUrls,
    party,
    sessionToken,
    instrumentId,
    amount,
}: {
    registryUrls: ReadonlyMap<PartyId, string>
    party: string
    sessionToken: string
    instrumentId: { admin: string; id: string }
    amount: number
}) => {
    // TODO: resolve this BEFORE calling this function so we can gray out the
    // button?
    const registryUrl = registryUrls.get(instrumentId.admin)
    if (!registryUrl)
        throw new Error(`no registry URL for admin ${instrumentId.admin}`)

    const amuletService = await resolveAmuletService({
        sessionToken,
    })
    const [tapCommand, disclosedContracts] = await amuletService.createTap(
        party,
        `${amount}`,
        instrumentId.admin,
        instrumentId.id,
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
