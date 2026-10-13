// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    AllocationFactory,
    AllocationInstruction,
} from '@daml.js/splice-api-token-allocation-instruction-v2-1.0.0/lib/Splice/Api/Token/AllocationInstructionV2/module.js'
import type { AllocationRequest } from '@daml.js/splice-api-token-allocation-request-v2-1.0.0/lib/Splice/Api/Token/AllocationRequestV2/module.js'
import type {
    Allocation,
    SettlementFactory,
} from '@daml.js/splice-api-token-allocation-v2-1.0.0/lib/Splice/Api/Token/AllocationV2/module.js'
import type { Holding } from '@daml.js/splice-api-token-holding-v2-1.0.0/lib/Splice/Api/Token/HoldingV2/module.js'
import type { EventLog } from '@daml.js/splice-api-token-transfer-events-v2-1.0.0/lib/Splice/Api/Token/TransferEventsV2/module.js'
import type {
    TransferFactory,
    TransferInstruction,
} from '@daml.js/splice-api-token-transfer-instruction-v2-1.0.0/lib/Splice/Api/Token/TransferInstructionV2/module.js'

// `satisfies` keeps the widening literal type of the public declarations
export const ALLOCATION_FACTORY_INTERFACE_ID_V2 =
    '#splice-api-token-allocation-instruction-v2:Splice.Api.Token.AllocationInstructionV2:AllocationFactory' satisfies typeof AllocationFactory.templateId
export const ALLOCATION_INSTRUCTION_INTERFACE_ID_V2 =
    '#splice-api-token-allocation-instruction-v2:Splice.Api.Token.AllocationInstructionV2:AllocationInstruction' satisfies typeof AllocationInstruction.templateId
export const ALLOCATION_REQUEST_INTERFACE_ID_V2 =
    '#splice-api-token-allocation-request-v2:Splice.Api.Token.AllocationRequestV2:AllocationRequest' satisfies typeof AllocationRequest.templateId
export const ALLOCATION_INTERFACE_ID_V2 =
    '#splice-api-token-allocation-v2:Splice.Api.Token.AllocationV2:Allocation' satisfies typeof Allocation.templateId
export const SETTLEMENT_FACTORY_INTERFACE_ID =
    '#splice-api-token-allocation-v2:Splice.Api.Token.AllocationV2:SettlementFactory' satisfies typeof SettlementFactory.templateId
export const HOLDING_INTERFACE_ID_V2 =
    '#splice-api-token-holding-v2:Splice.Api.Token.HoldingV2:Holding' satisfies typeof Holding.templateId
export const TRANSFER_FACTORY_INTERFACE_ID_V2 =
    '#splice-api-token-transfer-instruction-v2:Splice.Api.Token.TransferInstructionV2:TransferFactory' satisfies typeof TransferFactory.templateId
export const TRANSFER_INSTRUCTION_INTERFACE_ID_V2 =
    '#splice-api-token-transfer-instruction-v2:Splice.Api.Token.TransferInstructionV2:TransferInstruction' satisfies typeof TransferInstruction.templateId
export const EVENT_LOG_INTERFACE_ID =
    '#splice-api-token-transfer-events-v2:Splice.Api.Token.TransferEventsV2:EventLog' satisfies typeof EventLog.templateId
