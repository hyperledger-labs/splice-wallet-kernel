import pino from 'pino'

export type DisclosedContract = Record<string, unknown>

export interface RegistryTransferFactoryRecord {
    admin: string
    id: string
    factoryId: string
    disclosedContracts: DisclosedContract[]
    updatedAt?: string
}

export interface UpsertTransferFactoryRequest {
    admin: string
    id: string
    factoryId: string
    disclosedContracts?: DisclosedContract[]
}

export class RegistryService {
    private readonly baseUrl: string
    private readonly logger: pino.Logger

    constructor(
        baseUrl: string,
        logger: pino.Logger = pino({ name: 'registry-service', level: 'debug' })
    ) {
        this.baseUrl = baseUrl.replace(/\/$/, '')
        this.logger = logger
    }

    private url(path: string) {
        return `${this.baseUrl}${path}`
    }

    private async fetchJson<T>(
        input: RequestInfo,
        init?: RequestInit
    ): Promise<T> {
        const res = await fetch(input, {
            ...init,
            headers: {
                'content-type': 'application/json',
                ...(init?.headers ?? {}),
            },
        })
        if (!res.ok) {
            const text = await res.text().catch(() => '')
            this.logger.error(
                { status: res.status, body: text },
                'Registry request failed'
            )
            throw new Error(
                `Registry request failed: ${res.status} ${res.statusText} ${text}`
            )
        }
        return (await res.json()) as T
    }

    public async upsertTransferFactory(
        req: UpsertTransferFactoryRequest
    ): Promise<RegistryTransferFactoryRecord> {
        const body = JSON.stringify({
            admin: req.admin,
            id: req.id,
            factoryId: req.factoryId,
            disclosedContracts: req.disclosedContracts ?? [],
        })

        const record = await this.fetchJson<RegistryTransferFactoryRecord>(
            this.url('/v1/factories/transfer'),
            { method: 'POST', body }
        )

        record.disclosedContracts ??= []
        return record
    }

    public async getTransferFactory(
        admin: string,
        id: string
    ): Promise<RegistryTransferFactoryRecord> {
        const path = `/v1/factories/transfer/${encodeURIComponent(admin)}/${encodeURIComponent(id)}`

        const record = await this.fetchJson<RegistryTransferFactoryRecord>(
            this.url(path)
        )
        record.disclosedContracts ??= []
        return record
    }
}
