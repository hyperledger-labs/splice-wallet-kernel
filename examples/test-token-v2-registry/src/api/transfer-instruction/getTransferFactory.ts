// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import z from 'zod'
import { APIError } from '../common'
import type { OffLedger } from '@canton-network/core-token-standard-v2'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'
import { getTokenRulesFactory } from '../getTokenRulesFactory'

export const getTransferFactoryChoiceArgumentsSchema = z.looseObject({
    transfer: z.looseObject({
        sender: z.string(),
        receiver: z.string(),
        transferKind: z
            .union([z.literal('self'), z.literal('offer'), z.literal('direct')])
            .optional(),
    }),
})

/**
 * Resolves or creates a transfer factory for initiating transfer instruction workflows.
 *
 * @throws {400} When provided body request is invalid.
 * @throws {500} when instantiating new allocation factory contract has failed.
 * @returns Factory identifier, resolved transfer kind, and choice context on success.
 */
export const getTransferFactory: TExpressOpenApiRequestHandler<
    OffLedger.TransferInstructionV2.paths['/registry/transfer-instruction/v2/transfer-factory']['post']
> = async (req, res, next) => {
    // get choice arguments and invalidate them
    const { choiceArguments } = req.body

    const parsedChoiceArguments =
        getTransferFactoryChoiceArgumentsSchema.safeParse(choiceArguments)

    if (!parsedChoiceArguments.success) {
        next(
            new APIError(
                400,
                JSON.stringify(JSON.parse(parsedChoiceArguments.error.message))
            )
        )
        return
    }

    const transfer = parsedChoiceArguments.data.transfer
    const isToSelf = transfer.sender === transfer.receiver
    const transferKind = transfer.transferKind ?? (isToSelf ? 'self' : 'offer')

    try {
        const factoryData = await getTokenRulesFactory()
        res.json({
            factoryId: factoryData.contractId,
            choiceContext: {
                choiceContextData: {},
                disclosedContracts: [
                    {
                        templateId: factoryData.templateId,
                        contractId: factoryData.contractId,
                        createdEventBlob: factoryData.createdEventBlob ?? '',
                        synchronizerId: factoryData.synchronizerId,
                    },
                ],
            },
            transferKind,
        })
    } catch (e) {
        next(e)
    }
}
