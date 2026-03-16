// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { Types } from '@canton-network/core-ledger-client'
import { SignedTransaction } from '../transactions/signed.js'
import { Ops } from '@canton-network/core-provider-ledger'
import { AcsOptions } from '@canton-network/core-acs-reader'

export type PrepareOptions = {
    partyId: PartyId
    commands: WrappedCommand | WrappedCommand[] | unknown
    commandId?: string
    synchronizerId?: string
    disclosedContracts?: Types['DisclosedContract'][]
}

export type ExecuteOptions = {
    submissionId?: string
    partyId: PartyId
}

export type RawCommandMap = {
    ExerciseCommand: Types['ExerciseCommand']
    CreateCommand: Types['CreateCommand']
    CreateAndExerciseCommand: Types['CreateAndExerciseCommand']
}
export type WrappedCommand<
    K extends keyof RawCommandMap = keyof RawCommandMap,
> = {
    [P in K]: { [Q in P]: RawCommandMap[P] }
}[K]

export type ExecuteFn = (
    signed: SignedTransaction,
    options: ExecuteOptions
) => Promise<
    Ops.PostV2InteractiveSubmissionExecuteAndWait['ledgerApi']['result']
>

export type AcsRequestOptions = Omit<AcsOptions, 'offset'> & {
    offset?: number
}
