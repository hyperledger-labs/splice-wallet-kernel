// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SDKInterface } from '@canton-network/wallet-sdk'
import type { Logger } from 'pino'
import type { KnownSynchronizers } from './index.js'
import { Table } from 'console-table-printer'
import { z } from 'zod'

export type ContractReadSpec = {
    sdk: SDKInterface
    parties: string[]
}

const rowSchema = z.object({
    label: z.string(),
    template: z.string(),
    amount: z.string(),
    cid: z.string(),
    sync: z.string(),
})
type Row = z.infer<typeof rowSchema>

const table = new Table({
    columns: Object.keys(rowSchema.def.shape).map((name) => ({
        name,
        alignment: 'left',
    })),
})

/**
 * Query contracts for all given specs in parallel, then log the results as a
 * formatted ASCII table. Queries run concurrently; rows are printed in
 * declaration order.
 *
 * Notice: this function is intended for debugging and demonstration purposes in test scenarios only. It is not intended for generic use in production code
 */
export async function logAllContracts(
    logger: Logger,
    synchronizers: KnownSynchronizers,
    specs: ContractReadSpec[]
): Promise<void> {
    table.clearRows()
    const results = await Promise.all(
        specs.map(({ sdk, parties }) =>
            sdk.ledger.acsReader.raw.readJsContracts({
                parties,
                filterByParty: true,
            })
        )
    )

    const seenCids = new Set<string>()

    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i]
        const fallbackLabel = spec.parties[0].split('::')[0]
        const contracts = results[i]
        if (contracts.length === 0) {
            table.addRow({
                label: fallbackLabel,
                template: '(none)',
                amount: '-',
                cid: '-',
                sync: '-',
            } satisfies Row)
            continue
        }
        for (const c of contracts) {
            // De-duplicate: a contract can appear in multiple participants' ACS
            // streams (e.g. Alice's Token where Bob is the admin/signatory).
            if (seenCids.has(c.contractId)) continue
            seenCids.add(c.contractId)

            const templateParts = (c.templateId ?? '').split(':')
            const template =
                templateParts[templateParts.length - 1] || c.templateId
            const amount = extractAmount(c.createArgument)
            const rowLabel = extractOwner(c.createArgument) || fallbackLabel
            table.addRow({
                label: rowLabel,
                template,
                amount,
                cid: `${c.contractId.substring(0, 16)}...`,
                sync: syncAlias(c.synchronizerId, synchronizers),
            } satisfies Row)
        }
    }

    table.printTable()
}

/** Extract a human-readable amount from a contract's createArgument */
function extractAmount(createArgument: unknown): string {
    if (!createArgument) return ''
    const amountSchema = z.string().nullable()
    const amountObjectSchema = z.object({
        initialAmount: amountSchema,
    })
    const schema = z
        .object({
            amount: amountSchema.or(amountObjectSchema),
            holding: z.object({
                amount: amountSchema,
            }),
        })
        .partial()

    const parsedArgument = schema.parse(createArgument)

    const amount = parsedArgument.amount

    return (
        parsedArgument.holding?.amount ??
        (typeof amount === 'string' ? amount : (amount?.initialAmount ?? ''))
    )
}

/** Extract the owner (or admin for rules contracts) from a createArgument */
function extractOwner(createArgument: unknown): string {
    if (!createArgument) return ''

    const partySchema = z.string()

    const schema = z
        .object({
            holding: z.object({
                owner: partySchema,
            }),
            owner: partySchema,
            admin: partySchema,
            venue: partySchema,
        })
        .partial()

    const parsedArgument = schema.parse(createArgument)

    return (
        parsedArgument?.holding?.owner ??
        parsedArgument.owner ??
        parsedArgument.admin ??
        parsedArgument.venue ??
        ''
    ).split('::')[0]
}

/** Resolve a synchronizer ID to a logical role alias */
function syncAlias(syncId: string, synchronizers: KnownSynchronizers): string {
    if (syncId === synchronizers.globalSynchronizerId) return 'global'
    if (syncId === synchronizers.appSynchronizerId) return 'app-synchronizer'
    throw new Error(`Unknown synchronizer ID ${syncId}`)
}
