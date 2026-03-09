// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

export const ProfileSchema = z.enum(['sync', 'async'])
export type Profile = z.infer<typeof ProfileSchema>

export const ProviderConfigSchema = z.object({
    name: z.string().min(1),
    version: z.string().min(1).optional(),
    endpoint: z.url(),
    headers: z.record(z.string(), z.string()).optional(),
    timeoutMs: z.number().int().positive().optional(),
})
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>

export const TestStatusSchema = z.enum(['pass', 'fail', 'skip'])
export type TestStatus = z.infer<typeof TestStatusSchema>

export const TestResultSchema = z.object({
    id: z.string(),
    title: z.string(),
    category: z.enum(['protocol', 'schema', 'behavior', 'stability']),
    status: TestStatusSchema,
    details: z.string().optional(),
    elapsedMs: z.number().int().nonnegative(),
})
export type TestResult = z.infer<typeof TestResultSchema>

export const ArtifactSchema = z.object({
    schemaVersion: z.literal(1),
    suite: z.literal('cip-103-conformance'),
    profile: ProfileSchema,
    provider: z.object({
        name: z.string(),
        version: z.string().optional(),
        endpoint: z.url(),
    }),
    generatedAt: z.string(),
    summary: z.object({
        total: z.number().int().nonnegative(),
        passed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        status: z.enum(['pass', 'fail']),
    }),
    results: z.array(TestResultSchema),
    signature: z
        .object({
            algorithm: z.literal('ed25519'),
            value: z.string(),
            keyId: z.string().optional(),
        })
        .optional(),
})
export type Artifact = z.infer<typeof ArtifactSchema>
