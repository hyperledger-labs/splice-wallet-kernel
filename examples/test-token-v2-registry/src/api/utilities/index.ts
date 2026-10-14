// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Router } from 'express'
import { getUtilityOperator } from './getUtilityOperator'

const utilitiesAPIRouter: Router = Router()

utilitiesAPIRouter.get('/api/utilities/v0/operator', getUtilityOperator)

export default utilitiesAPIRouter
