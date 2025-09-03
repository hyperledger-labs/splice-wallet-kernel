// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import type { AuthContext } from '@canton-network/core-wallet-auth'

// Augments the global `Express` namespace
declare global {
    namespace Express {
        interface Request {
            authContext?: AuthContext | undefined
        }
    }
}
