// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type AcsContractLike = {
    templateId: string
    createArgument: unknown
}

export type TypedAcsContract<
    TPayload,
    TContract extends AcsContractLike = AcsContractLike,
> = Omit<TContract, 'createArgument'> & {
    createArgument: TPayload
}

export function toTemplateContract<TPayload, TContract extends AcsContractLike>(
    contract: TContract,
    expectedTemplateId: string
): TypedAcsContract<TPayload, TContract> | undefined {
    if (contract.templateId !== expectedTemplateId) {
        return undefined
    }

    return contract as TypedAcsContract<TPayload, TContract>
}

export function toTemplateContracts<
    TPayload,
    TContract extends AcsContractLike,
>(
    contracts: TContract[],
    expectedTemplateId: string
): TypedAcsContract<TPayload, TContract>[] {
    return contracts
        .map((contract) =>
            toTemplateContract<TPayload, TContract>(
                contract,
                expectedTemplateId
            )
        )
        .filter(
            (contract): contract is TypedAcsContract<TPayload, TContract> =>
                contract !== undefined
        )
}

export function expectTemplateContract<
    TPayload,
    TContract extends AcsContractLike,
>(
    contract: TContract,
    expectedTemplateId: string,
    label: string
): TypedAcsContract<TPayload, TContract> {
    if (contract.templateId !== expectedTemplateId) {
        throw new Error(
            `${label} expected template ${expectedTemplateId}, got ${contract.templateId}`
        )
    }

    return contract as TypedAcsContract<TPayload, TContract>
}
