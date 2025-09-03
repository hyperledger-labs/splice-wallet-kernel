// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
export interface AppConfig {
    userRpcUri: string
}

export const config: AppConfig = {
    userRpcUri: import.meta.env.VITE_USER_RPC_API,
}
