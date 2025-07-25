import { storeConfigSchema } from 'core-wallet-store'
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
})

export const configSchema = z.object({
    kernel: kernelInfoSchema,
    store: storeConfigSchema,
})

export type KernelInfo = z.infer<typeof kernelInfoSchema>
export type Config = z.infer<typeof configSchema>
