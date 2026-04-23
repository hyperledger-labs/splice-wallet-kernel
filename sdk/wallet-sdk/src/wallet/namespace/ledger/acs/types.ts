// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AcsOptions } from '@canton-network/core-acs-reader'
import {
    ArchivedEvent,
    CreatedEvent,
    JsGetActiveContractsResponse,
} from '@canton-network/core-ledger-client-types'
import { ContractId } from '@canton-network/core-token-standard'

export type ACSKey = {
    parties: AcsOptions['parties']
} & (
    | {
          interfaceIds: AcsOptions['interfaceIds']
          templateIds?: never
      }
    | {
          interfaceIds?: never
          templateIds: AcsOptions['templateIds']
      }
)

export type ACEvent = {
    offset: number
    event: CreatedEvent | ArchivedEvent
    workflowId: string | null
    synchronizerId: string | null
    archived?: boolean
}

export type ACSInitialState = {
    // offset at which initialAcs is valid
    offset: number
    // the initial ACS at acsOffset
    acs: Array<JsGetActiveContractsResponse>
}
export type ACSUpdatesState = {
    // last seen update offset
    offset: number
    // all updates since acsOffset - will be used to calculate ACS at any offset >= acsOffset
    // may be compacted (see ACSUpdateConfig.maxEventsBeforePrune and ACSUpdateConfig.safeOffsetDeltaForPrune)
    allACs: Array<ACEvent>
}

export type ACSState = {
    initial: ACSInitialState
    updates: ACSUpdatesState
    archivedACs: Set<ContractId<string>>
}

export const ACS_UPDATE_CONFIG = {
    // How many events do we accumulate before we prune (compact) the ACS history - set to 0 to enable to compact all events, which is more efficient as long as application always ask for increasing (or equal) offsets
    maxEventsBeforePrune: 150,
    // When we compact the ACS history, we keep all events within this offset delta of the last seen update offset - set 0 to allow to compact everything
    safeOffsetDeltaForPrune: 200,
    // How many updates do we fetch at once when fetching updates - if there are more updates, we will fetch again until we have caught up (returned data is always complete to the requested endInclusive offset - even if that means multiple fetches)
    maxUpdatesToFetch: 100,
} as const
