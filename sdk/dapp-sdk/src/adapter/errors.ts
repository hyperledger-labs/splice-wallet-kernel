// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type DappErrorCode =
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

export class DappError extends Error {
    readonly code: DappErrorCode
    readonly cause?: unknown

    constructor(code: DappErrorCode, message: string, cause?: unknown) {
        super(message)
        this.name = 'DappError'
        this.code = code
        this.cause = cause
    }
}

export class WalletNotFoundError extends DappError {
    constructor(walletId: string) {
        super('WALLET_NOT_FOUND', `Wallet "${walletId}" not found`)
    }
}

export class WalletNotInstalledError extends DappError {
    constructor(walletId: string) {
        super(
            'WALLET_NOT_INSTALLED',
            `Wallet "${walletId}" is not installed or unavailable`
        )
    }
}

export class UserRejectedError extends DappError {
    constructor(message = 'User rejected the request') {
        super('USER_REJECTED', message)
    }
}

export class SessionExpiredError extends DappError {
    constructor() {
        super('SESSION_EXPIRED', 'Session has expired, please reconnect')
    }
}

export class TimeoutError extends DappError {
    constructor(operation: string, timeoutMs: number) {
        super('TIMEOUT', `${operation} timed out after ${timeoutMs}ms`)
    }
}

export class NotConnectedError extends DappError {
    constructor() {
        super('NOT_CONNECTED', 'No active wallet connection')
    }
}
