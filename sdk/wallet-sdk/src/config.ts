// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const LOCALNET_SCAN_PROXY_API_URL = new URL(
    'http://localhost:2000/api/validator'
)

const LOCALNET_SCAN_API_URL = new URL('http://scan.localhost:4000/api/scan')

//scan proxy exposes the registry endpoints as well
const LOCALNET_REGISTRY_API_URL = new URL(
    LOCALNET_SCAN_PROXY_API_URL.href + '/v0/scan-proxy'
)

export const localNetStaticConfig = {
    LOCALNET_SCAN_PROXY_API_URL,
    LOCALNET_SCAN_API_URL,
    LOCALNET_REGISTRY_API_URL,
}
