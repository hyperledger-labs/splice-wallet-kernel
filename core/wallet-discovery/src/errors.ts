// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type DiscoveryErrorCode =
    | 'WALLET_NOT_FOUND'
    | 'WALLET_NOT_INSTALLED'
    | 'USER_REJECTED'
    | 'SESSION_EXPIRED'
    | 'TRANSPORT_ERROR'
    | 'TIMEOUT'
    | 'PROVIDER_NOT_FOUND'
    | 'ALREADY_CONNECTED'
    | 'NOT_CONNECTED'
    | 'INTERNAL_ERROR'

export class DiscoveryError extends Error {
    readonly code: DiscoveryErrorCode
    readonly cause?: unknown

    constructor(code: DiscoveryErrorCode, message: string, cause?: unknown) {
        super(message)
        this.name = 'DiscoveryError'
        this.code = code
        this.cause = cause
    }
}

export class WalletNotFoundError extends DiscoveryError {
    constructor(walletId: string) {
        super('WALLET_NOT_FOUND', `Wallet "${walletId}" not found`)
    }
}

export class WalletNotInstalledError extends DiscoveryError {
    constructor(walletId: string) {
        super(
            'WALLET_NOT_INSTALLED',
            `Wallet "${walletId}" is not installed or unavailable`
        )
    }
}

export class UserRejectedError extends DiscoveryError {
    constructor(message = 'User rejected the request') {
        super('USER_REJECTED', message)
    }
}

export class SessionExpiredError extends DiscoveryError {
    constructor() {
        super('SESSION_EXPIRED', 'Session has expired, please reconnect')
    }
}

export class TimeoutError extends DiscoveryError {
    constructor(operation: string, timeoutMs: number) {
        super('TIMEOUT', `${operation} timed out after ${timeoutMs}ms`)
    }
}

export class NotConnectedError extends DiscoveryError {
    constructor() {
        super('NOT_CONNECTED', 'No active wallet connection')
    }
}
