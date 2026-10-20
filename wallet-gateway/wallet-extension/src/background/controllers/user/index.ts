// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { UserControllerDeps } from './deps'
import { messages } from './messages'
import { networks } from './networks'
import buildController from './rpc-gen'
import { sessions } from './sessions'
import { transactions } from './transactions'
import { unsupported } from './unsupported'
import { wallets } from './wallets'

export type { UserControllerDeps } from './deps'

/**
 * The user API, called by the extension pages. Each area module returns its
 * part of `Methods`; `buildController` fails to typecheck if one is missing.
 */
export const userController = (deps: UserControllerDeps) =>
    buildController({
        ...sessions(deps),
        ...networks(deps),
        ...wallets(deps),
        ...transactions(deps),
        ...messages(),
        ...unsupported(),
    })
