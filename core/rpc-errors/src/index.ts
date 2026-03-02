// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes } from '@metamask/rpc-errors'

export { rpcErrors, providerErrors, JsonRpcError } from '@metamask/rpc-errors'

export const toHttpErrorCode = (rpcCode: number): number => {
    const errorMap = {
        [errorCodes.rpc.parse]: 400,
        [errorCodes.rpc.invalidRequest]: 400,
        [errorCodes.rpc.methodNotFound]: 404,
        [errorCodes.rpc.invalidParams]: 400,
        [errorCodes.rpc.invalidInput]: 400,
        [errorCodes.provider.unauthorized]: 401,
        [errorCodes.rpc.internal]: 500,
    }

    return errorMap[rpcCode] || 500
}
