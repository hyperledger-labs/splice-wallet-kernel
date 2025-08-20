import express from 'express'
import cors from 'cors'
import { z } from 'zod'

export type DisclosedContract = Record<string, unknown>

export interface InstrumentKey {
    admin: string
    id: string
}

export interface TransferFactoryRecord extends InstrumentKey {
    factoryId: string
    disclosedContracts?: DisclosedContract[]
    updatedAt: string
    registryId?: string
    holderParty?: string
}

const upsertBodySchema = z.object({
    admin: z.string().min(1, 'admin (Party) is required'),
    id: z.string().min(1, 'id (Text) is required'),
    factoryId: z.string().min(1, 'factoryId is required'),
    disclosedContracts: z.array(z.record(z.unknown())).optional().default([]),
})

const app = express()
app.use(cors())
app.use(express.json())

const store = new Map<string, Map<string, TransferFactoryRecord>>()

function getBucket(admin: string) {
    let bucket = store.get(admin)
    if (!bucket) {
        bucket = new Map<string, TransferFactoryRecord>()
        store.set(admin, bucket)
    }
    return bucket
}

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))

app.post('/v1/factories/transfer', (req, res) => {
    const parsed = upsertBodySchema.safeParse(req.body)
    if (!parsed.success) {
        console.log('parsed', parsed.error)
        return res
            .status(400)
            .json({
                error: 'Invalid request body',
                details: parsed.error.flatten(),
            })
    }
    const { admin, id, factoryId, disclosedContracts } = parsed.data
    const now = new Date().toISOString()

    const record = {
        admin,
        id,
        factoryId,
        disclosedContracts,
        updatedAt: now,
    }

    const bucket = getBucket(admin)
    bucket.set(id, record)
    return res.status(201).json(record)
})

app.get('/v1/factories/transfer/:admin/:id', (req, res) => {
    const admin = req.params.admin
    const id = req.params.id
    const bucket = store.get(admin)
    const record = bucket?.get(id)
    if (!record) {
        return res.status(404).json({
            error: 'Not found',
            message: `No TransferFactory for admin=${admin}, id=${id}`,
        })
    }
    return res.json(record)
})

app.delete('/v1/factories/transfer/:admin/:id', (req, res) => {
    const { admin, id } = req.params
    const bucket = store.get(admin)
    if (!bucket) return res.status(404).send()
    const existed = bucket.delete(id)
    if (bucket.size === 0) store.delete(admin)
    return res.status(existed ? 204 : 404).send()
})

const PORT = Number(process.env.PORT || 8002)
app.listen(PORT, () => {
    console.log(`Mock registry listening on http://localhost:${PORT}`)
})
