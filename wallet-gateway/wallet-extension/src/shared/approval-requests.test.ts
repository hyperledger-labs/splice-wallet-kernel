// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import {
    consumeNextApprovalRequest,
    enqueueApprovalRequest,
} from './approval-requests'
import { WALLET_NAME } from './brand'
import { approvalRequestsItem } from './storage'

const request = (n: number) => ({
    transactionId: `tx-${n}`,
    commandId: `command-${n}`,
})

describe('approval requests', () => {
    beforeEach(() => {
        fakeBrowser.reset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('queues each transaction once and shows the count on the badge', async () => {
        await enqueueApprovalRequest(request(1))
        await enqueueApprovalRequest(request(2))
        await enqueueApprovalRequest(request(1))

        expect(await approvalRequestsItem.getValue()).toEqual([
            request(1),
            request(2),
        ])
        expect(await fakeBrowser.action.getBadgeText({})).toBe('2')
        expect(await fakeBrowser.action.getTitle({})).toBe(
            '2 transactions awaiting review'
        )
    })

    it('keeps every request when they are queued at the same time', async () => {
        await Promise.all([
            enqueueApprovalRequest(request(1)),
            enqueueApprovalRequest(request(2)),
            enqueueApprovalRequest(request(3)),
        ])

        expect(await approvalRequestsItem.getValue()).toEqual([
            request(1),
            request(2),
            request(3),
        ])
        expect(await fakeBrowser.action.getBadgeText({})).toBe('3')
    })

    it('keeps queuing after a failed update', async () => {
        vi.spyOn(approvalRequestsItem, 'setValue').mockRejectedValueOnce(
            new Error('Storage quota exceeded')
        )

        await expect(enqueueApprovalRequest(request(1))).rejects.toThrow(
            'Storage quota exceeded'
        )
        await enqueueApprovalRequest(request(2))

        expect(await approvalRequestsItem.getValue()).toEqual([request(2)])
    })

    it('uses the singular title for one request', async () => {
        await enqueueApprovalRequest(request(1))

        expect(await fakeBrowser.action.getTitle({})).toBe(
            '1 transaction awaiting review'
        )
    })

    it('caps the badge at 9', async () => {
        for (let n = 1; n <= 12; n++) await enqueueApprovalRequest(request(n))

        expect(await fakeBrowser.action.getBadgeText({})).toBe('9')
        expect(await fakeBrowser.action.getTitle({})).toBe(
            '12 transactions awaiting review'
        )
    })

    it('consumes the oldest request and clears the badge when empty', async () => {
        await enqueueApprovalRequest(request(1))
        await enqueueApprovalRequest(request(2))

        await expect(consumeNextApprovalRequest()).resolves.toEqual(request(1))
        expect(await fakeBrowser.action.getBadgeText({})).toBe('1')

        await expect(consumeNextApprovalRequest()).resolves.toEqual(request(2))
        await expect(consumeNextApprovalRequest()).resolves.toBeUndefined()
        expect(await approvalRequestsItem.getValue()).toEqual([])
        expect(await fakeBrowser.action.getBadgeText({})).toBe('')
        expect(await fakeBrowser.action.getTitle({})).toBe(WALLET_NAME)
    })

    it('is empty again after the stored queue is removed', async () => {
        await enqueueApprovalRequest(request(1))
        await approvalRequestsItem.removeValue()

        expect(await approvalRequestsItem.getValue()).toEqual([])
    })

    it('still queues the request when the badge cannot be updated', async () => {
        vi.spyOn(fakeBrowser.action, 'setBadgeText').mockRejectedValue(
            new Error('No badge')
        )

        await enqueueApprovalRequest(request(1))

        expect(await approvalRequestsItem.getValue()).toEqual([request(1)])
    })
})
