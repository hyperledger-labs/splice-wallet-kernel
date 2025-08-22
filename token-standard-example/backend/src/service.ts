import {
    TokenTransferFactory,
    TokenTransferInstruction,
} from '@daml.js/exercise-app/lib/TokenTransfer'
import { TokenHolding } from '@daml.js/exercise-app/lib/TokenHolding'
import type { GetResponse, PostRequest } from '@splice/core-ledger-client'
import { LedgerClient } from '@splice/core-ledger-client'
import { Transfer } from '@daml.js/token-standard-transfer-instruction/lib/Splice/Api/Token/TransferInstructionV1'

export type LedgerCtx = { client: LedgerClient; party: string; userId?: string }

export interface ITokenHolding {
    contractId: string
    owner: string
    dso: string
    amount: string
    instrumentId: { admin: string; id: string }
    meta: { values: Record<string, unknown> }
}

export interface ITokenTransferFactory {
    contractId: string
    admin: string
    observers: string[]
    meta: { values: Record<string, unknown> }
}

export interface ITokenTransferInstruction {
    contractId: string
    transfer: Transfer
}

class HttpError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

async function getLedgerEnd(ctx: LedgerCtx): Promise<number> {
    const response = await ctx.client.get('/v2/state/ledger-end')
    return response.offset
}

async function queryAcs(ctx: LedgerCtx, templateId: string) {
    const offset = await getLedgerEnd(ctx)
    const req: PostRequest<'/v2/state/active-contracts'> = {
        eventFormat: {
            filtersByParty: {
                [ctx.party]: {
                    cumulative: [
                        {
                            identifierFilter: {
                                TemplateFilter: {
                                    value: {
                                        templateId,
                                        includeCreatedEventBlob: false,
                                    },
                                },
                            },
                        },
                    ],
                },
            },
            verbose: false,
        },
        activeAtOffset: offset,
        verbose: false,
    }
    return ctx.client.post('/v2/state/active-contracts', req)
}

function extractRightsSets(
    rightsResp: GetResponse<'/v2/users/{user-id}/rights'>
) {
    const rights = rightsResp?.rights ?? []
    const actAs = new Set<string>()
    const readAs = new Set<string>()
    for (const r of rights) {
        // @ts-expect-error reason TBS
        const a = r?.kind?.CanActAs?.value?.party
        // @ts-expect-error reason TBS
        const rd = r?.kind?.CanReadAs?.value?.party
        if (a) actAs.add(a)
        if (rd) readAs.add(rd)
    }
    return { actAs, readAs }
}

export async function validatePartyAccess(
    ctx: LedgerCtx
): Promise<{ actAs: boolean; readAs: boolean }> {
    const rightsResp = await ctx.client.get('/v2/users/{user-id}/rights', {
        path: { 'user-id': 'operator' },
    })
    const sets = extractRightsSets(rightsResp)
    const canAct = sets.actAs.has(ctx.party)
    const canRead = sets.readAs.has(ctx.party)

    if (!canAct && !canRead) {
        throw new HttpError(`Permission denied for party ${ctx.party}`, 403)
    }
    return { actAs: canAct, readAs: canRead }
}

export async function fetchHoldings(ctx: LedgerCtx): Promise<ITokenHolding[]> {
    const acs = await queryAcs(ctx, TokenHolding.templateId)
    return acs.flatMap((e: unknown) => {
        // @ts-expect-error reason TBS
        const ev = e?.contractEntry?.JsActiveContract?.createdEvent
        if (!ev?.createArgument) return []
        const arg = ev.createArgument
        return [
            {
                contractId: ev.contractId,
                owner: arg.owner,
                dso: arg.dso,
                amount: arg.amount,
                instrumentId: {
                    admin: arg.instrumentId.admin,
                    id: arg.instrumentId.id,
                },
                meta: { values: arg.meta?.values ?? {} },
            },
        ]
    })
}

export async function fetchTransfers(
    ctx: LedgerCtx
): Promise<ITokenTransferInstruction[]> {
    const acs = await queryAcs(ctx, TokenTransferInstruction.templateId)
    return acs.flatMap((ac) => {
        const ev = ac?.contractEntry?.JsActiveContract?.createdEvent
        // @ts-expect-error reason TBS
        return ev?.createArgument
            ? [
                  {
                      contractId: ev.contractId,
                      transfer: ev.createArgument.transfer,
                  },
              ]
            : []
    })
}

export async function fetchTransferFactories(
    ctx: LedgerCtx
): Promise<ITokenTransferFactory[]> {
    const acs = await queryAcs(ctx, TokenTransferFactory.templateId)
    return acs.flatMap((ac) => {
        const ev = ac?.contractEntry?.JsActiveContract?.createdEvent
        if (!ev?.createArgument) return []
        const arg = ev.createArgument
        // @ts-expect-error reason tbs
        return [
            {
                contractId: ev.contractId,
                admin: arg.admin,
                observers: arg.observers ?? [],
                meta: { values: arg.meta?.values ?? {} },
            },
        ]
    })
}
