// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import {
    PageChangeEvent,
    TransactionCardReviewEvent,
} from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeTransaction,
    mockRequest,
} from '../test-helpers.js'

const {
    mockCreateUserClient,
    handleErrorToast,
    setLocationHref,
    parsePreparedTransaction,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    handleErrorToast: vi.fn(),
    setLocationHref: vi.fn(),
    parsePreparedTransaction: vi.fn(() => ({ summary: 'parsed' })),
}))

vi.mock('../index.js', () => ({}))
vi.mock('../navigation.js', () => ({ setLocationHref }))
vi.mock('../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../state-manager.js', () => ({
    stateManager: {
        accessToken: { get: () => 'test-token' },
        currentOrigin: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
}))
vi.mock('@canton-network/core-tx-visualizer', () => ({
    parsePreparedTransaction,
}))
vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return {
        ...actual,
        handleErrorToast,
    }
})

import './index.js'
import type { UserUiActivities } from './index.js'

function makeTransactions(count: number) {
    return Array.from({ length: count }, (_, i) =>
        makeTransaction({
            id: `tx-${i + 1}`,
            commandId: `cmd-${i + 1}`,
        })
    )
}

function getTransactionCards(el: UserUiActivities) {
    return Array.from(
        el.shadowRoot?.querySelectorAll('wg-transaction-card') ?? []
    ) as unknown as Array<{ transactionId: string }>
}

describe('UserUiActivities', () => {
    let el: UserUiActivities
    const componentFixture = html`<user-ui-activities></user-ui-activities>`

    beforeEach(() => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        parsePreparedTransaction.mockClear()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders activities header and transaction cards after loading', async () => {
        mockRequest.mockResolvedValue({
            transactions: makeTransactions(2),
        })

        el = await fixture<UserUiActivities>(componentFixture)

        await waitUntil(
            () => el.transactions.length === 2,
            'transactions loaded'
        )

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Activities'
        )
        expect(
            el.shadowRoot?.querySelectorAll('wg-transaction-card').length
        ).toBe(2)
        expect(el.loading).toBe(false)
    })

    it('shows empty state when there are no transactions', async () => {
        mockRequest.mockResolvedValue({ transactions: [] })

        el = await fixture<UserUiActivities>(componentFixture)

        await waitUntil(() => !el.loading)

        expect(el.shadowRoot?.textContent).toContain('No activities yet')
    })
    it('shows pagination when there are more than one page of activities', async () => {
        mockRequest.mockResolvedValue({
            transactions: makeTransactions(4),
            count: 4,
        })

        el = await fixture<UserUiActivities>(componentFixture)

        await waitUntil(() => el.transactions.length === 4)
        const pagination = el.shadowRoot?.querySelector(
            'wg-pagination'
        ) as HTMLElement & { count: number }

        expect(pagination).toBeNull()
    })

    it('shows pagination when there are more than one page of activities', async () => {
        mockRequest.mockResolvedValue({
            transactions: makeTransactions(4),
            nextCursor: 'tx-4:randomisodatestring',
            count: 5,
        })

        el = await fixture<UserUiActivities>(componentFixture)

        await waitUntil(() => el.transactions.length === 4)
        const pagination = el.shadowRoot?.querySelector(
            'wg-pagination'
        ) as HTMLElement & { count: number }

        expect(pagination).not.toBeNull()
        expect(el.totalTransactionCount).toBe(5)

        expect(getTransactionCards(el).map((c) => c.transactionId)).toEqual([
            'tx-1',
            'tx-2',
            'tx-3',
            'tx-4',
        ])
    })

    it('updates current page when pagination emits page-change', async () => {
        mockRequest.mockResolvedValueOnce({
            transactions: makeTransactions(4),
            nextCursor: 'next-page-cursor',
            count: 5,
        })

        mockRequest.mockResolvedValueOnce({
            transactions: [makeTransaction({ id: 'tx-5', commandId: 'cmd-5' })],
            nextCursor: null,
            count: 5,
        })

        el = await fixture<UserUiActivities>(componentFixture)
        await waitUntil(() => el.transactions.length === 4)

        const pagination = el.shadowRoot?.querySelector(
            'wg-pagination'
        ) as HTMLElement & { page: number; count: number }
        pagination!.dispatchEvent(new PageChangeEvent(2))

        await waitUntil(
            () =>
                el.transactions.length === 1 &&
                getTransactionCards(el)[0]?.transactionId === 'tx-5',
            'page 2 rendered'
        )

        expect(pagination!.page).toBe(2)
        expect(getTransactionCards(el)).toHaveLength(1)
        expect(getTransactionCards(el)[0]?.transactionId).toBe('tx-5')
        expect(mockRequest).toHaveBeenCalledTimes(2)
        expect(mockRequest).toHaveBeenNthCalledWith(2, {
            method: 'listTransactions',
            params: {
                limit: 4,
                cursor: 'next-page-cursor',
            },
        })
    })

    it('navigates to approve page when a card emits transaction-review', async () => {
        mockRequest.mockResolvedValue({
            transactions: makeTransactions(1),
        })

        el = await fixture<UserUiActivities>(componentFixture)
        await waitUntil(() => el.transactions.length === 1)

        const card = el.shadowRoot?.querySelector('wg-transaction-card')
        card!.dispatchEvent(new TransactionCardReviewEvent('tx-1', 'cmd-1'))

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('transactionId=tx-1')
        )
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/approve')
        )
    })

    it('calls handleErrorToast when listing transactions fails', async () => {
        mockRequest.mockRejectedValue(new Error('list failed'))

        el = await fixture<UserUiActivities>(componentFixture)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(el.loading).toBe(false)
        expect(el.transactions).toEqual([])
    })
})
