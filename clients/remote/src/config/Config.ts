// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { storeConfigSchema } from '@canton-network/core-wallet-store'
import { signingConfigSchema } from '@canton-network/core-signing-lib'
import { z } from 'zod'

export const kernelInfoSchema = z.object({
    id: z.string(),
    clientType: z.union([
        z.literal('browser'),
        z.literal('desktop'),
        z.literal('mobile'),
        z.literal('remote'),
    ]),
    url: z.string().url(),
    userUrl: z.string().url(),
})

export const configSchema = z.object({
    kernel: kernelInfoSchema,
    store: storeConfigSchema,
    signing: signingConfigSchema.optional(),
})

export type KernelInfo = z.infer<typeof kernelInfoSchema>
export type Config = z.infer<typeof configSchema>
