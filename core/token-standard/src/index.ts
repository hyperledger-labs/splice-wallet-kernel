// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * from './token-standard-client.js'
export * from './interface-ids.const.js'
export * from './types'

export {
    Splice as SpliceTokenAllocationInstructionV1,
    packageId as tokenAllocationInstructionV1PackageId,
} from '@daml.js/splice-api-token-allocation-instruction-v1-1.0.0'
export {
    Splice as SpliceTokenAllocationRequestV1,
    packageId as tokenAllocationRequestV1PackageId,
} from '@daml.js/splice-api-token-allocation-request-v1-1.0.0'
export {
    Splice as SpliceTokenAllocationV1,
    packageId as tokenAllocationV1PackageId,
} from '@daml.js/splice-api-token-allocation-v1-1.0.0'
export {
    Splice as SpliceTokenBurnMintV1,
    packageId as tokenBurnMintV1PackageId,
} from '@daml.js/splice-api-token-burn-mint-v1-1.0.0'
export {
    Splice as SpliceTokenHoldingV1,
    packageId as tokenHoldingV1PackageId,
} from '@daml.js/splice-api-token-holding-v1-1.0.0'
export {
    Splice as SpliceTokenMetadataV1,
    packageId as tokenMetadataV1PackageId,
} from '@daml.js/splice-api-token-metadata-v1-1.0.0'
export {
    Splice as SpliceTokenTransferInstructionV1,
    packageId as tokenTransferInstructionV1PackageId,
} from '@daml.js/splice-api-token-transfer-instruction-v1-1.0.0'
