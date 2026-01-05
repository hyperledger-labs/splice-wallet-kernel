// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * from './error'
export * from './provider'
export * from './provider/index'
export * from './provider/request'
export * from './provider/events'
export * from './provider/open'
export * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'

// Initialize default listeners
import './listener.js'
