// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type { VaultStatus } from '@/shared/vault-protocol'
export {
    CorruptVaultError,
    InvalidPasswordError,
    VaultExistsError,
    VaultLockedError,
    VaultNotFoundError,
    WeakPasswordError,
} from './errors'
export { createVault, type Vault, type VaultItem } from './vault'
