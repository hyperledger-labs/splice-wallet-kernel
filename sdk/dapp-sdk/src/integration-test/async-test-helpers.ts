// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletEvent } from '@canton-network/core-types'
import { MOCK_DAPP_API_PATH } from './mock-remote-gateway/json-rpc-handlers'

const MOCK_TOKEN = 'integration-test-token'
const MOCK_SESSION_ID = 'integration-test-session'

export function installMockRemoteIdpPostMessage(): () => void {
    // TODO make it less hacky
    const orig = globalThis.fetch.bind(globalThis)
    globalThis.fetch = async (input, init) => {
        const res = await orig(input, init)
        try {
            const url =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.href
                      : input.url
            if (
                url.includes(MOCK_DAPP_API_PATH) &&
                init?.method === 'POST' &&
                init.body != null
            ) {
                const body = JSON.parse(String(init.body)) as {
                    method?: string
                }
                if (body.method === 'connect') {
                    queueMicrotask(() => {
                        window.dispatchEvent(
                            new MessageEvent('message', {
                                origin: window.location.origin,
                                data: {
                                    type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                                    token: MOCK_TOKEN,
                                    sessionId: MOCK_SESSION_ID,
                                },
                            })
                        )
                    })
                }
            }
        } catch {
            // ignore parse errors; let the test fail on assertion if needed
        }
        return res
    }
    return () => {
        globalThis.fetch = orig
    }
}
