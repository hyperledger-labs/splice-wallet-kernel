// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import { describe, expect, it, vi } from 'vitest'
import {
    allocationResultToast,
    buildCreateWalletParams,
    buildListWalletsParams,
    isWalletEditable,
    isWalletSyncNeeded,
    loadWallets,
    partitionWallets,
    partyStatusToast,
    resolveNetworkId,
    sortKeysByName,
    syncWallets,
    walletStatusToCode,
    walletSyncResultToast,
    WALLET_STATUS_CODE,
} from './parties.js'

const wallet = (overrides: Partial<Wallet>): Wallet =>
    ({
        partyId: 'party::ns',
        status: 'allocated',
        signingProviderId: 'wallet-kernel',
        ...overrides,
    }) as Wallet

describe('walletStatusToCode', () => {
    it('maps every wallet status to its code', () => {
        expect(walletStatusToCode('allocated')).toBe(
            WALLET_STATUS_CODE.WALLET_ALLOCATED
        )
        expect(walletStatusToCode('initialized')).toBe(
            WALLET_STATUS_CODE.WALLET_INITIALIZED
        )
        expect(walletStatusToCode('removed')).toBe(
            WALLET_STATUS_CODE.WALLET_REMOVED
        )
    })
})

describe('partyStatusToast', () => {
    it('returns a toast for each known code', () => {
        expect(partyStatusToast('1')).toMatchObject({
            title: 'Party created',
            type: 'success',
        })
        expect(partyStatusToast('2')).toMatchObject({
            title: 'Party creation pending',
            type: 'info',
        })
        expect(partyStatusToast('3')).toMatchObject({
            title: 'Party creation rejected',
            type: 'error',
        })
        expect(partyStatusToast('4')).toMatchObject({
            title: 'Party edited',
            type: 'success',
        })
    })

    it('returns undefined for missing and unknown codes', () => {
        expect(partyStatusToast(null)).toBeUndefined()
        expect(partyStatusToast(undefined)).toBeUndefined()
        expect(partyStatusToast('99')).toBeUndefined()
    })
})

describe('allocationResultToast', () => {
    it('returns a toast for each wallet status', () => {
        expect(allocationResultToast('removed')?.type).toBe('error')
        expect(allocationResultToast('allocated')?.type).toBe('success')
        expect(allocationResultToast('initialized')?.type).toBe('info')
    })
})

describe('walletSyncResultToast', () => {
    it('counts the added, updated and disabled wallets', () => {
        expect(
            walletSyncResultToast({
                added: ['a'],
                updated: ['b', 'c'],
                disabled: [],
            })
        ).toEqual({
            title: 'Wallet Sync Complete',
            message: 'Added: 1, Updated: 2, Disabled: 0.',
            type: 'success',
        })
    })
})

describe('partitionWallets', () => {
    it('splits allocated wallets from the others', () => {
        const allocated = wallet({ partyId: 'a', status: 'allocated' })
        const initialized = wallet({ partyId: 'b', status: 'initialized' })
        const removed = wallet({ partyId: 'c', status: 'removed' })

        expect(partitionWallets([allocated, initialized, removed])).toEqual({
            verifiedWallets: [allocated],
            unverifiedWallets: [initialized, removed],
        })
    })

    it('handles undefined', () => {
        expect(partitionWallets(undefined)).toEqual({
            verifiedWallets: [],
            unverifiedWallets: [],
        })
    })
})

describe('isWalletEditable', () => {
    it('is false only for the fixed signing provider', () => {
        expect(
            isWalletEditable(
                { signingProviderId: 'participant' },
                'participant'
            )
        ).toBe(false)
        expect(
            isWalletEditable({ signingProviderId: 'fireblocks' }, 'participant')
        ).toBe(true)
    })
})

describe('sortKeysByName', () => {
    it('sorts without mutating the input', () => {
        const keys = [{ name: 'b' }, { name: 'a' }]
        expect(sortKeysByName(keys)).toEqual([{ name: 'a' }, { name: 'b' }])
        expect(keys[0]).toEqual({ name: 'b' })
    })
})

describe('buildCreateWalletParams', () => {
    it('omits keyName when it is empty or missing', () => {
        const base = {
            primary: true,
            partyHint: 'alice',
            signingProviderId: 'p',
        }
        expect(buildCreateWalletParams(base)).toEqual(base)
        expect(buildCreateWalletParams({ ...base, keyName: '' })).toEqual(base)
        expect(buildCreateWalletParams({ ...base, keyName: 'k' })).toEqual({
            ...base,
            keyName: 'k',
        })
    })
})

describe('network resolution', () => {
    it('prefers the session network over the stored one', () => {
        expect(
            resolveNetworkId(
                [{ network: { id: 'session' } } as never],
                'stored'
            )
        ).toBe('session')
        expect(resolveNetworkId([], 'stored')).toBe('stored')
        expect(resolveNetworkId(undefined, null)).toBeUndefined()
    })

    it('filters wallets by network only when there is one', () => {
        expect(buildListWalletsParams('n1')).toEqual({
            filter: { networkIds: ['n1'] },
        })
        expect(buildListWalletsParams(undefined)).toEqual({})
    })
})

describe('loadWallets', () => {
    it('lists the wallets of the session network', async () => {
        const request = vi.fn(async ({ method }: { method: string }) =>
            method === 'listSessions'
                ? { sessions: [{ network: { id: 'n1' } }] }
                : [wallet({ partyId: 'a' })]
        )

        const wallets = await loadWallets({ request } as never, 'stored')

        expect(wallets).toEqual([wallet({ partyId: 'a' })])
        expect(request).toHaveBeenCalledWith({
            method: 'listWallets',
            params: { filter: { networkIds: ['n1'] } },
        })
    })

    it('falls back to the stored network when listSessions fails', async () => {
        const request = vi.fn(async ({ method }: { method: string }) => {
            if (method === 'listSessions') throw new Error('no session')
            return undefined
        })

        const wallets = await loadWallets({ request } as never, 'stored')

        expect(wallets).toEqual([])
        expect(request).toHaveBeenCalledWith({
            method: 'listWallets',
            params: { filter: { networkIds: ['stored'] } },
        })
    })
})

describe('wallet sync', () => {
    it('reports whether a sync is needed, treating errors as needed', async () => {
        const needed = {
            request: vi.fn(async () => ({ walletSyncNeeded: true })),
        }
        const upToDate = {
            request: vi.fn(async () => ({ walletSyncNeeded: false })),
        }
        const failing = {
            request: vi.fn(async () => {
                throw new Error('check failed')
            }),
        }

        expect(await isWalletSyncNeeded(needed as never)).toBe(true)
        expect(await isWalletSyncNeeded(upToDate as never)).toBe(false)
        expect(await isWalletSyncNeeded(failing as never)).toBe(true)
    })

    it('requests a sync', async () => {
        const result = { added: [], updated: [], disabled: [] }
        const request = vi.fn(async () => result)

        expect(await syncWallets({ request } as never)).toBe(result)
        expect(request).toHaveBeenCalledWith({ method: 'syncWallets' })
    })
})
