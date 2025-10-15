// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * from './sdk'
export * from './sdk/request'
export * from './sdk/events'
export * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'

export enum ErrorCode {
    UserCancelled,
    Timeout,
    Other,
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}
