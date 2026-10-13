// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Splice } from './models/index.js'
import type { PartyId } from '@canton-network/core-types'

export const TransferInstructionV2 = Splice.Api.Token.TransferInstructionV2
export const AllocationInstructionV2 = Splice.Api.Token.AllocationInstructionV2
export const AllocationRequestV2 = Splice.Api.Token.AllocationRequestV2
export const AllocationV2 = Splice.Api.Token.AllocationV2
export const HoldingV2 = Splice.Api.Token.HoldingV2
export const MetadataV1 = Splice.Api.Token.MetadataV1

export type {
    Holding,
    HoldingView,
    Lock,
    InstrumentId,
    HoldingInterface,
    Account,
} from '@daml.js/splice-api-token-holding-v2-1.0.0/lib/Splice/Api/Token/HoldingV2/module.js'

export type {
    Transfer,
    TransferInstructionView,
    TransferInstruction_Accept,
    TransferInstruction_Reject,
    TransferInstruction_Withdraw,
    TransferFactoryView,
    TransferFactory_PublicFetch,
    TransferFactory_Transfer,
    TransferInstructionResult,
    TransferInstructionResult_Output,
    TransferFactoryInterface,
    TransferInstructionInterface,
    TransferInstructionAction,
} from '@daml.js/splice-api-token-transfer-instruction-v2-1.0.0/lib/Splice/Api/Token/TransferInstructionV2/module.js'

// Export companion objects as values (needed for accessing choice names at runtime)
export {
    TransferInstruction,
    TransferFactory,
} from '@daml.js/splice-api-token-transfer-instruction-v2-1.0.0/lib/Splice/Api/Token/TransferInstructionV2/module.js'

export type {
    AllocationFactory_Allocate,
    AllocationFactoryView,
    AllocationFactory_PublicFetch,
    AllocationInstruction_Withdraw,
    AllocationInstructionView,
    AllocationInstructionResult,
    AllocationInstructionResult_Output,
    AllocationFactoryInterface,
    AllocationInstructionInterface,
} from '@daml.js/splice-api-token-allocation-instruction-v2-1.0.0/lib/Splice/Api/Token/AllocationInstructionV2/module.js'

// Export companion objects as values (needed for accessing choice names at runtime)
export {
    AllocationFactory,
    AllocationInstruction,
} from '@daml.js/splice-api-token-allocation-instruction-v2-1.0.0/lib/Splice/Api/Token/AllocationInstructionV2/module.js'

export type {
    AllocationRequest,
    AllocationRequestView,
    AllocationRequest_Reject,
    AllocationRequest_Withdraw,
    AllocationRequestInterface,
} from '@daml.js/splice-api-token-allocation-request-v2-1.0.0/lib/Splice/Api/Token/AllocationRequestV2/module.js'

export type {
    AllocationSpecification,
    TransferLeg,
    SettlementInfo,
    AllocationView,
    AllocationInterface,
    Allocation_Withdraw,
    Allocation_Cancel,
    AllocationResult_Output,
    SettlementFactory_SettleBatchResult,
    SettlementFactory_PublicFetch,
    SettlementFactory_SettleBatch,
    SettlementFactoryView,
    FinalizedAllocation,
    TransferLegSide,
} from '@daml.js/splice-api-token-allocation-v2-1.0.0/lib/Splice/Api/Token/AllocationV2/module.js'

// Export companion object as value (needed for accessing choice names at runtime)
export {
    Allocation,
    SettlementFactory,
} from '@daml.js/splice-api-token-allocation-v2-1.0.0/lib/Splice/Api/Token/AllocationV2/module.js'

export {
    EventLog,
    EventLogView,
    EventLog_HoldingsChange,
    EventLog_HoldingsChangeResult,
} from '@daml.js/splice-api-token-transfer-events-v2-1.0.0/lib/Splice/Api/Token/TransferEventsV2/module.js'

export type { EventLogInterface } from '@daml.js/splice-api-token-transfer-events-v2-1.0.0/lib/Splice/Api/Token/TransferEventsV2/module.js'

export type {
    ExtraArgs,
    Metadata,
    ChoiceExecutionMetadata,
    AnyContract,
    AnyContractInterface,
    AnyContractView,
    ChoiceContext,
    AnyValue,
} from '@daml.js/splice-api-token-metadata-v1-1.0.0/lib/Splice/Api/Token/MetadataV1/module.js'

export type Beneficiaries = {
    beneficiary: PartyId
    weight: number
}
