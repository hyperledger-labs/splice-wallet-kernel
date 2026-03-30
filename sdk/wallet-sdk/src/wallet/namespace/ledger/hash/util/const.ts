// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HashingSchemeVersion } from '@canton-network/core-ledger-proto'

export const NODE_ENCODING_VERSION = Uint8Array.from([0x01])

export const HASHING_SCHEME_VERSION = Uint8Array.from([HashingSchemeVersion.V2])

export const PREPARED_TRANSACTION_HASH_PURPOSE = Uint8Array.from([
    0x00, 0x00, 0x00, 0x30,
])
