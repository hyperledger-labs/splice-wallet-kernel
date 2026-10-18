// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { browser } from 'wxt/browser'
import { WALLET_NAME } from './brand'
import { type ApprovalRequest, approvalRequestsItem } from './storage'

export type { ApprovalRequest } from './storage'

async function updateActionBadge(requests: ApprovalRequest[]): Promise<void> {
    // Firefox builds are MV2, which has `browserAction` instead of `action`.
    const action = browser.action ?? browser.browserAction
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

export async function enqueueApprovalRequest(
    request: ApprovalRequest
): Promise<void> {
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
}

export async function consumeNextApprovalRequest(): Promise<
    ApprovalRequest | undefined
> {
    const requests = await approvalRequestsItem.getValue()
    const [nextRequest, ...remainingRequests] = requests

    if (nextRequest) {
        await approvalRequestsItem.setValue(remainingRequests)
    }
    await updateActionBadge(remainingRequests)

    return nextRequest
}
