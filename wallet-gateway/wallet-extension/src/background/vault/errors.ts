// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { VaultErrorName } from '@/shared/vault-protocol'

// Each class sets `name`: messaging sends only the name and message, so the
// pages tell errors apart by name.

export class VaultLockedError extends Error {
    constructor(message = 'The vault is locked.') {
        super(message)
        this.name = VaultErrorName.Locked
    }
}

export class InvalidPasswordError extends Error {
    constructor(options?: ErrorOptions) {
        super('The password is wrong.', options)
        this.name = VaultErrorName.InvalidPassword
    }
}

export class CorruptVaultError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = VaultErrorName.Corrupt
    }
}

export class VaultExistsError extends Error {
    constructor() {
        super('A vault already exists.')
        this.name = VaultErrorName.Exists
    }
}

export class VaultNotFoundError extends Error {
    constructor() {
        super('There is no vault.')
        this.name = VaultErrorName.NotFound
    }
}

export class WeakPasswordError extends Error {
    constructor(problems: string[]) {
        super(problems.join(' '))
        this.name = VaultErrorName.WeakPassword
    }
}
