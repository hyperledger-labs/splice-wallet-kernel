// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TestToken } from '@canton-network/core-splice-codegen'
import z from 'zod'
import { APIError } from '../common'
import type { OffLedger } from '@canton-network/core-token-standard'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'
import { RegistryState } from '../../common/state'

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
    OffLedger.TransferInstructionV1.paths['/registry/transfer-instruction/v1/transfer-factory']['post']
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

    // fetch the factory contract (if existing)...
    const fetchedFactories =
        await RegistryState.instance.sdk.ledger.acsReader.readJsContracts({
            filterByParty: true,
            parties: [RegistryState.instance.operator.party],
            templateIds: [TestToken.DAR.TestTokenV1.TokenRules.templateId],
        })

    const foundFactory = RegistryState.instance.synchronizerId
        ? // multi-sync mode
          fetchedFactories.find(
              (factory) =>
                  factory.synchronizerId ===
                  RegistryState.instance.synchronizerId
          )
        : // no multi-sync mode
          fetchedFactories[0]

    if (foundFactory) {
        res.json({
            factoryId: foundFactory.contractId,
            transferKind,
            choiceContext: {
                choiceContextData: {},
                disclosedContracts: [
                    {
                        templateId: foundFactory.templateId,
                        contractId: foundFactory.contractId,
                        createdEventBlob: foundFactory.createdEventBlob ?? '',
                        synchronizerId: foundFactory.synchronizerId,
                    },
                ],
            },
        })
        return
    }

    // ...and create one otherwise
    const executionResult = await RegistryState.instance.sdk.ledger
        .prepare({
            partyId: RegistryState.instance.operator.party,
            commands: TestToken.commands.create.rules({
                admin: RegistryState.instance.operator.party,
            }),
            ...(RegistryState.instance.synchronizerId
                ? {
                      synchronizerId: RegistryState.instance.synchronizerId,
                  }
                : {}),
        })
        .sign(RegistryState.instance.operator.keys.privateKey)
        .execute({
            partyId: RegistryState.instance.operator.party,
        })

    // fetch the newly created contract id
    const newFactoryContracts =
        await RegistryState.instance.sdk.ledger.acsReader.readJsContracts({
            filterByParty: true,
            parties: [RegistryState.instance.operator.party],
            offset: executionResult.completionOffset,
            templateIds: [TestToken.DAR.TestTokenV1.TokenRules.templateId],
        })

    const newFactoryFound = RegistryState.instance.synchronizerId
        ? // multi-sync mode
          newFactoryContracts.find(
              (factory) =>
                  factory.synchronizerId ===
                  RegistryState.instance.synchronizerId
          )
        : // no multi-sync mode
          newFactoryContracts[0]

    if (newFactoryFound) {
        res.json({
            factoryId: newFactoryFound.contractId,
            transferKind,
            choiceContext: {
                choiceContextData: {},
                disclosedContracts: [
                    {
                        templateId: newFactoryFound.templateId,
                        contractId: newFactoryFound.contractId,
                        createdEventBlob:
                            newFactoryFound.createdEventBlob ?? '',
                        synchronizerId: newFactoryFound.synchronizerId,
                    },
                ],
            },
        })
        return
    }

    next(
        new APIError(
            500,
            `Error instantiating transfer factory (completionOffset=${executionResult.completionOffset}`
        )
    )
}
