// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AssetBody } from '../../asset/index.js'
import {
    allocationInstructionRegistryTypes,
    AllocationSpecification,
} from '@canton-network/core-token-standard'

export type AllocationInstructionCreateParams = {
    allocationSpecification: AllocationSpecification
    asset: AssetBody
    inputUtxos?: string[]
    requestedAt?: string
    prefetchedRegistryChoiceContext?: {
        factoryId: string
        choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    }
}

export type AllocationParams = {
    allocationCid: string
    asset: AssetBody
    prefetchedRegistryChoiceContext?: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
}
