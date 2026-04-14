// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * from './wallet/index.js'
export * from './config.js'
export {
    type AcsContractLike,
    type TypedAcsContract,
    toTemplateContract,
    toTemplateContracts,
    expectTemplateContract,
} from '@canton-network/core-acs-reader'
