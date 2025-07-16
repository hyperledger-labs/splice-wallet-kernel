import { z } from 'zod'

export const ledgerApiSchema = z.object({
    baseUrl: z.string(),
})

export const passwordAuthSchema = z.object({
    type: z.literal('password'),
    tokenUrl: z.string(),
    grantType: z.string(),
    scope: z.string(),
    clientId: z.string(),
})

const implicitAuthSchema = z.object({
    type: z.literal('implicit'),
    domain: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
})

export const authSchema = z.discriminatedUnion('type', [
    passwordAuthSchema,
    implicitAuthSchema,
])

export const networkConfigSchema = z.object({
    name: z.string(),
    networkId: z.string(),
    synchronizerId: z.string(),
    description: z.string(),
    ledgerApi: ledgerApiSchema,
    auth: authSchema,
})

export const storeConfigSchema = z.object({
    networks: z.array(networkConfigSchema),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>
export type Auth = z.infer<typeof authSchema>
export type NetworkConfig = z.infer<typeof networkConfigSchema>
export type ImplicitAuth = z.infer<typeof implicitAuthSchema>
export type PasswordAuth = z.infer<typeof passwordAuthSchema>
export type LedgerApi = z.infer<typeof ledgerApiSchema>
