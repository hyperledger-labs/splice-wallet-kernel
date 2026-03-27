// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Types } from '@canton-network/core-ledger-client'
import { RawCommandMap, WrappedCommand } from '../ledger/index.js'

export type PreparedCommand<
    K extends keyof RawCommandMap | (keyof RawCommandMap)[] = [
        'ExerciseCommand',
        'CreateCommand',
    ],
> = [
    K extends (keyof RawCommandMap)[]
        ? WrappedCommand<K[number]>
        : K extends keyof RawCommandMap
          ? WrappedCommand<K>
          : never,
    Types['DisclosedContract'][],
]
