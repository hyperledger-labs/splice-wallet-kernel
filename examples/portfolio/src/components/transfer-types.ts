// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { InstrumentId } from '@canton-network/core-token-standard'
import type { TokenStandardVersion } from '../types/instruments'

export interface SelectableInstrument {
    instrumentId: InstrumentId
    symbol: string
    name: string
    availableAmount: string
    decimals: number | undefined
}

export interface TransferFormData {
    instrumentId: InstrumentId | null
    tokenStandardVersion: TokenStandardVersion
    amount: string
    recipient: string
    memo: string
    expiry: Date | null
}

export interface SubmittedTransfer {
    sender: string
    instrumentId: InstrumentId
    instrumentSymbol?: string
    instrumentName?: string
    amount: string
    recipient: string
    memo: string
    expiry: Date
    submittedAt: Date
    tokenStandardVersion: TokenStandardVersion
}
