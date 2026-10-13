// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import z from 'zod'

export const emptyChoiceContext = {
    choiceContextData: { values: {} },
    disclosedContracts: [],
}

export class APIError extends Error {
    constructor(
        public readonly status: number,
        message?: string
    ) {
        super(message)
    }
}

export const metaSchema = z.record(z.string(), z.string())

export const choiceContextRequestSchema = z.union([
    z.object({
        meta: metaSchema,
        excludeDebugFields: z.boolean(),
    }),
    z.object({
        excludeDebugFields: z.boolean(),
    }),
])

export const disclosedContractSchema = z.object({
    templateId: z.string(),
    contractId: z.string(),
    createdEventBlob: z.string(),
    synchronizerId: z.string(),
    debugPackageName: z.string().optional(),
    debugPayload: z.record(z.string(), z.never()),
    debugCreatedAt: z.string().optional(),
})

export const choiceContextSchema = z.object({
    choiceContextData: z.record(z.string(), z.never()),
    disclosedContracts: z.array(disclosedContractSchema),
})
