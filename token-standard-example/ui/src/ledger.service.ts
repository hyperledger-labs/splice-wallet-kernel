import { Transfer } from '@daml.js/token-standard-transfer-instruction/lib/Splice/Api/Token/TransferInstructionV1'

const SERVER_URL = 'http://localhost:3333'

export interface ITokenHolding {
    contractId: string
    owner: string
    dso: string
    amount: string
    instrumentId: {
        admin: string
        id: string
    }
    meta: {
        values: Record<string, unknown>
    }
}

export interface ITokenTransferFactory {
    contractId: string
    admin: string
    observers: string[]
    meta: {
        values: Record<string, unknown>
    }
}

export interface ITokenTransferInstruction {
    contractId: string
    transfer: Transfer
}

type CreateOptions = {
    party?: string
    baseUrl?: string
}

export class LedgerService {
    private constructor(
        public readonly login: string,
        private readonly baseUrl: string
    ) {}

    public userId?: string
    public party?: string

    static async create(
        login: string,
        sessionToken: string,
        opts: CreateOptions = {}
    ): Promise<LedgerService> {
        const baseUrl = SERVER_URL
        const selectedParty = opts.party ?? login // TODO temp

        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login, sessionToken, party: selectedParty }),
        })
        if (!res.ok) throw new Error("Couldn't find authenticate")

        const data = await res.json().catch(() => ({}))
        const svc = new LedgerService(login, baseUrl)
        svc.party = data?.party ?? selectedParty
        svc.userId = 'operator'
        return svc
    }

    public get isOperator() {
        return Boolean(this.party && this.party.startsWith('operator:'))
    }

    private async getJSON<T>(path: string): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'GET',
            credentials: 'include',
        })
        const json = await res.json()
        return (json?.data ?? json) as T
    }

    public async fetchHoldings(): Promise<ITokenHolding[]> {
        return this.getJSON<ITokenHolding[]>('/holdings')
    }

    public async fetchTransfers(): Promise<ITokenTransferInstruction[]> {
        return this.getJSON<ITokenTransferInstruction[]>('/transfers')
    }

    public async fetchTransferFactories(): Promise<ITokenTransferFactory[]> {
        return this.getJSON<ITokenTransferFactory[]>('/transfer-factories')
    }

    // TODO temp, replace with wallet kernel signing for write operations

    public async createTransfer(): Promise<never> {
        throw new Error('createTransfer not implemented')
    }

    public async createHolding(): Promise<never> {
        throw new Error('createHolding not implemented')
    }

    public async acceptTransfer(): Promise<never> {
        throw new Error('acceptTransfer not implemented')
    }

    public async rejectTransfer(): Promise<never> {
        throw new Error('rejectTransfer not implemented')
    }

    public async fetchParties(): Promise<string[]> {
        // TODO replace with wallet-kernel provided list of accounts.
        throw new Error(
            'fetchParties should come from wallet kernel accounts in the FE now.'
        )
    }
}
