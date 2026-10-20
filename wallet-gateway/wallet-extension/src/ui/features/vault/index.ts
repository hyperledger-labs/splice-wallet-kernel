// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Vault: the password that locks the wallet. Set it during onboarding, unlock,
// lock, and follow status changes made in other pages.

export { useLockVault, vaultStatusQuery } from './api'
export { SetPasswordPage } from './SetPasswordPage'
export { UnlockPage } from './UnlockPage'
export { watchVaultStatus } from './watch-vault-status'
