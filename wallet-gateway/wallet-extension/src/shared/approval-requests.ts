// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { browser } from 'wxt/browser'
import { WALLET_NAME } from './brand'
import { type ApprovalRequest, approvalRequestsItem } from './storage'

export type { ApprovalRequest } from './storage'

async function updateActionBadge(requests: ApprovalRequest[]): Promise<void> {
    const action = browser.action
    const count = requests.length
    await Promise.allSettled([
        action.setBadgeText({
            text: count === 0 ? '' : `${Math.min(count, 9)}`,
        }),
        action.setTitle({
            title:
                count === 0
                    ? WALLET_NAME
                    : `${count} transaction${count === 1 ? '' : 's'} awaiting review`,
        }),
    ])
}

let lastUpdate: Promise<unknown> = Promise.resolve()

/**
 * Runs queue updates one at a time. Each one reads, changes and writes the
 * whole queue, so two concurrent updates would otherwise overwrite each other.
 * This only orders updates made in the same JavaScript context.
 */
function updateQueue<T>(update: () => Promise<T>): Promise<T> {
    const result = lastUpdate.then(update)
    lastUpdate = result.catch(() => undefined)
    return result
}

export function enqueueApprovalRequest(
    request: ApprovalRequest
): Promise<void> {
    return updateQueue(async () => {
        // Don't mutate: when nothing is stored, this is the item's fallback array.
        let requests = await approvalRequestsItem.getValue()
        if (
            !requests.some(
                (candidate) => candidate.transactionId === request.transactionId
            )
        ) {
            requests = [...requests, request]
            await approvalRequestsItem.setValue(requests)
        }
        await updateActionBadge(requests)
    })
}

export function consumeNextApprovalRequest(): Promise<
    ApprovalRequest | undefined
> {
    return updateQueue(async () => {
        const requests = await approvalRequestsItem.getValue()
        const [nextRequest, ...remainingRequests] = requests

        if (nextRequest) {
            await approvalRequestsItem.setValue(remainingRequests)
        }
        await updateActionBadge(remainingRequests)

        return nextRequest
    })
}
