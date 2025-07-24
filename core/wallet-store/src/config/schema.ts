import { z } from 'zod'

export const ledgerApiSchema = z.object({
    baseUrl: z.string(),
})

export const passwordAuthSchema = z.object({
    type: z.literal('password'),
    issuer: z.string(),
    configUrl: z.string(),
    tokenUrl: z.string(),
    grantType: z.string(),
    scope: z.string(),
    clientId: z.string(),
})

const implicitAuthSchema = z.object({
    type: z.literal('implicit'),
    issuer: z.string(),
    configUrl: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
})

export const authSchema = z.discriminatedUnion('type', [
    passwordAuthSchema,
    implicitAuthSchema,
])

export const networkSchema = z.object({
    name: z.string(),
    chainId: z.string(),
    synchronizerId: z.string(),
    description: z.string(),
    ledgerApi: ledgerApiSchema,
    auth: authSchema,
})

export const storeConfigSchema = z.object({
    networks: z.array(networkSchema),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>
export type Auth = z.infer<typeof authSchema>
export type Network = z.infer<typeof networkSchema>
export type ImplicitAuth = z.infer<typeof implicitAuthSchema>
export type PasswordAuth = z.infer<typeof passwordAuthSchema>
export type LedgerApi = z.infer<typeof ledgerApiSchema>
