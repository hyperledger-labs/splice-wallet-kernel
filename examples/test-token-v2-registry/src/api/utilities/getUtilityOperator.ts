// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from 'express'
import { RegistryState } from '../../common/state'

export const getUtilityOperator = (_req: Request, res: Response) => {
    res.json({
        partyId: RegistryState.instance.operator.party,
    })
}
