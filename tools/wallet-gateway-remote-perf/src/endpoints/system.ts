// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import http from 'k6/http'
import type { EndpointSpec } from '../types'

interface BuildArgs {
    baseUrl: string
    runId: string
}

export function buildSystemEndpoints({
    baseUrl,
    runId,
}: BuildArgs): EndpointSpec[] {
    return [
        {
            name: 'healthz',
            group: 'system',
            path: '/healthz',
            method: 'GET',
            tags: { endpoint: 'healthz', endpoint_group: 'system' },
            execute: () =>
                http.get(`${baseUrl}/healthz`, {
                    headers: { 'x-perf-run-id': runId },
                    tags: { endpoint: 'healthz', endpoint_group: 'system' },
                }),
        },
        {
            name: 'readyz',
            group: 'system',
            path: '/readyz',
            method: 'GET',
            tags: { endpoint: 'readyz', endpoint_group: 'system' },
            execute: () =>
                http.get(`${baseUrl}/readyz`, {
                    headers: { 'x-perf-run-id': runId },
                    tags: { endpoint: 'readyz', endpoint_group: 'system' },
                }),
        },
        {
            name: 'well-known-wallet-gateway-config',
            group: 'system',
            path: '/.well-known/wallet-gateway-config',
            method: 'GET',
            tags: {
                endpoint: 'well-known-wallet-gateway-config',
                endpoint_group: 'system',
            },
            execute: () =>
                http.get(`${baseUrl}/.well-known/wallet-gateway-config`, {
                    headers: { 'x-perf-run-id': runId },
                    tags: {
                        endpoint: 'well-known-wallet-gateway-config',
                        endpoint_group: 'system',
                    },
                }),
        },
        {
            name: 'well-known-wallet-gateway-version',
            group: 'system',
            path: '/.well-known/wallet-gateway-version',
            method: 'GET',
            tags: {
                endpoint: 'well-known-wallet-gateway-version',
                endpoint_group: 'system',
            },
            execute: () =>
                http.get(`${baseUrl}/.well-known/wallet-gateway-version`, {
                    headers: { 'x-perf-run-id': runId },
                    tags: {
                        endpoint: 'well-known-wallet-gateway-version',
                        endpoint_group: 'system',
                    },
                }),
        },
    ]
}
