// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { LedgerTypes } from '../../sdk.js'
import { AcsOptions } from '@canton-network/core-acs-reader'

export type PrepareOptions = {
    partyId: PartyId
    commands: WrappedCommand | WrappedCommand[] | unknown
    commandId?: string
    synchronizerId?: string
    disclosedContracts?: LedgerTypes['DisclosedContract'][]
}

export type ExecuteOptions = {
    submissionId?: string
    partyId: PartyId
}

export type RawCommandMap = {
    ExerciseCommand: LedgerTypes['ExerciseCommand']
    CreateCommand: LedgerTypes['CreateCommand']
    CreateAndExerciseCommand: LedgerTypes['CreateAndExerciseCommand']
}
export type WrappedCommand<
    K extends keyof RawCommandMap = keyof RawCommandMap,
> = {
    [P in K]: { [Q in P]: RawCommandMap[P] }
}[K]

export type AcsRequestOptions = Omit<
    AcsOptions,
    'offset' | 'continueUntilCompletion'
> & {
    offset?: number
}
