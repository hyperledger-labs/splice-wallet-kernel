// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import http, { type RefinedResponse } from 'k6/http'

interface RpcCallArgs {
    url: string
    method: string
    params?: Record<string, unknown>
    endpointGroup: string
    endpointName: string
    runId: string
}

export function rpcCall({
    url,
    method,
    params,
    endpointGroup,
    endpointName,
    runId,
}: RpcCallArgs): RefinedResponse<'text'> {
    return http.post(
        url,
        JSON.stringify({
            id: `${runId}-${endpointName}-${Date.now()}`,
            jsonrpc: '2.0',
            method,
            ...(params ? { params } : {}),
        }),
        {
            headers: {
                'content-type': 'application/json',
                ...(!!__ENV.ACCESS_TOKEN && {
                    authorization: `Bearer ${__ENV.ACCESS_TOKEN}`,
                }),
                'x-perf-run-id': runId,
            },
            tags: {
                endpoint: endpointName,
                endpoint_group: endpointGroup,
                endpoint_method: method,
                protocol: 'jsonrpc',
            },
            timeout: __ENV.REQUEST_TIMEOUT ?? '30s',
        }
    )
}
