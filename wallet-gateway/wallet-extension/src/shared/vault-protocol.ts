// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineExtensionMessaging } from '@webext-core/messaging'

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked'

/** Messages the extension pages send to the background's vault service. */
export interface VaultProtocol {
    'vault.getStatus'(): VaultStatus
    'vault.create'(data: { password: string }): void
    'vault.unlock'(data: { password: string }): void
    'vault.lock'(): void
}

export const vaultMessenger = defineExtensionMessaging<VaultProtocol>()

/**
 * `error.name` of the errors vault operations throw. Messaging rebuilds a
 * thrown error as a plain `Error` with its name, message, stack and cause, so
 * compare names; `instanceof` doesn't survive. Never put a password or key in
 * an error.
 */
export const VaultErrorName = {
    /** The vault isn't unlocked, or a lock came in during the operation. */
    Locked: 'VaultLockedError',
    /** The password doesn't open the vault. */
    InvalidPassword: 'InvalidPasswordError',
    /** The stored vault is malformed. It is never reset automatically. */
    Corrupt: 'CorruptVaultError',
    /** `create` found an existing vault. */
    Exists: 'VaultExistsError',
    /** `unlock` found no vault. */
    NotFound: 'VaultNotFoundError',
    /** A new password breaks the password policy. */
    WeakPassword: 'WeakPasswordError',
} as const

export type VaultErrorName =
    (typeof VaultErrorName)[keyof typeof VaultErrorName]
