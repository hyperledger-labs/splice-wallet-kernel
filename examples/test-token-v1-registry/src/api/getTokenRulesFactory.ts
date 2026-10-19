// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TestToken } from '@canton-network/core-splice-codegen'
import { RegistryState } from '../common/state'
import { APIError } from './common'

/**
 * @throws {500} when instantiating new allocation factory contract has failed.
 * @returns Factory contract data
 */
export const getTokenRulesFactory = async () => {
    // fetch factory contract (if existing)...
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
        return foundFactory
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

    const newFoundFactory = RegistryState.instance.synchronizerId
        ? // multi-sync mode
          newFactoryContracts.find(
              (factory) =>
                  factory.synchronizerId ===
                  RegistryState.instance.synchronizerId
          )
        : // no multi-sync mode
          newFactoryContracts[0]

    if (newFoundFactory) {
        return newFoundFactory
    }

    throw new APIError(
        500,
        `Error instantiating allocation
             factory (completionOffset=${executionResult.completionOffset}`
    )
}
