import * as store from './Store'
import { z, ZodType, ZodObject } from 'zod'

type SchemaFromInterface<T> = ZodObject<{
    [K in keyof Partial<T>]: K extends keyof T ? ZodType<T[K]> : never
}>

const accountSchema = z.object({
    id: z.string(),
    name: z.string(),
}) satisfies SchemaFromInterface<store.Account>

const paperAddressSchema = z.object({
    publicKey: z.string(),
    privateKey: z.string(),
}) satisfies SchemaFromInterface<store.PaperAddress>

/* eslint-disable @typescript-eslint/no-unused-vars */
const walletSchema = z.object({
    primary: z.boolean(),
    partyId: z.string(),
    hint: z.string(),
    fingerprint: z.string(),
    addressType: accountSchema || paperAddressSchema,
    chainId: z.string(),
}) satisfies SchemaFromInterface<store.Wallet>

/* eslint-disable @typescript-eslint/no-unused-vars */
const sessionSchema = z.object({
    network: z.string(),
    accessToken: z.string(),
}) satisfies SchemaFromInterface<store.Session>

/* eslint-disable @typescript-eslint/no-unused-vars */
const ccspAddressSchema = z.object({
    provider: z.string(),
    id: z.string(),
    publicKey: z.string(),
}) satisfies SchemaFromInterface<store.CCSPAddress>

const ledgerApiSchema = z.object({
    baseUrl: z.string(),
}) satisfies SchemaFromInterface<store.LedgerApi>

const passwordAuthSchema = z.object({
    tokenUrl: z.string(),
    grantType: z.string(),
    scope: z.string(),
    clientId: z.string(),
}) satisfies SchemaFromInterface<store.PasswordAuth>

const implicitAuthSchema = z.object({
    domain: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
}) satisfies SchemaFromInterface<store.ImplicitAuth>

/* eslint-disable @typescript-eslint/no-unused-vars */
const networkConfigSchema = z.object({
    name: z.string(),
    description: z.string(),
    ledgerApi: ledgerApiSchema,
    authType: passwordAuthSchema || implicitAuthSchema,
}) satisfies SchemaFromInterface<store.NetworkConfig>
