// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const LOCALNET_SCAN_PROXY_API_URL = new URL(
    'http://wallet.localhost:2000/api/validator'
)
const LOCALNET_REGISTRY_API_URL = new URL('http://scan.localhost:4000')

export const localNetStaticConfig = {
    LOCALNET_SCAN_PROXY_API_URL,
    LOCALNET_REGISTRY_API_URL,
}
