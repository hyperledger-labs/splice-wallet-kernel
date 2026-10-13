// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    AllocationFactory,
    AllocationInstruction,
} from '@daml.js/splice-api-token-allocation-instruction-v1-1.0.0/lib/Splice/Api/Token/AllocationInstructionV1/module.js'
import type { AllocationRequest } from '@daml.js/splice-api-token-allocation-request-v1-1.0.0/lib/Splice/Api/Token/AllocationRequestV1/module.js'
import type { Allocation } from '@daml.js/splice-api-token-allocation-v1-1.0.0/lib/Splice/Api/Token/AllocationV1/module.js'
import type { Holding } from '@daml.js/splice-api-token-holding-v1-1.0.0/lib/Splice/Api/Token/HoldingV1/module.js'
import type { AnyContract } from '@daml.js/splice-api-token-metadata-v1-1.0.0/lib/Splice/Api/Token/MetadataV1/module.js'
import type {
    TransferFactory,
    TransferInstruction,
} from '@daml.js/splice-api-token-transfer-instruction-v1-1.0.0/lib/Splice/Api/Token/TransferInstructionV1/module.js'

// `satisfies` keeps the widening literal type of the public declarations
export const ALLOCATION_FACTORY_INTERFACE_ID =
    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory' satisfies typeof AllocationFactory.templateId
export const ALLOCATION_INSTRUCTION_INTERFACE_ID =
    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationInstruction' satisfies typeof AllocationInstruction.templateId
export const ALLOCATION_REQUEST_INTERFACE_ID =
    '#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest' satisfies typeof AllocationRequest.templateId
export const ALLOCATION_INTERFACE_ID =
    '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation' satisfies typeof Allocation.templateId
export const HOLDING_INTERFACE_ID =
    '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding' satisfies typeof Holding.templateId
export const METADATA_INTERFACE_ID =
    '#splice-api-token-metadata-v1:Splice.Api.Token.MetadataV1:AnyContract' satisfies typeof AnyContract.templateId
export const TRANSFER_FACTORY_INTERFACE_ID =
    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory' satisfies typeof TransferFactory.templateId
export const TRANSFER_INSTRUCTION_INTERFACE_ID =
    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction' satisfies typeof TransferInstruction.templateId
export const FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID =
    '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy'
export const MERGE_DELEGATION_PROPOSAL_TEMPLATE_ID =
    '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal'
export const MERGE_DELEGATION_TEMPLATE_ID =
    '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegation'
export const MERGE_DELEGATION_BATCH_MERGE_UTILITY =
    '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:BatchMergeUtility'
