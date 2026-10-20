// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Methods } from './rpc-gen'

export const messages = (): Pick<
    Methods,
    | 'signMessage'
    | 'getMessageToSign'
    | 'getSignMessageStatus'
    | 'listMessagesToSign'
    | 'deleteMessageToSign'
> => ({
    signMessage: async () => {
        throw new Error('Function signMessage not implemented.')
    },
    getMessageToSign: async () => {
        throw new Error('Function getMessageToSign not implemented.')
    },
    getSignMessageStatus: async () => {
        throw new Error('Function getSignMessageStatus not implemented.')
    },
    listMessagesToSign: async () => {
        throw new Error('Function listMessagesToSign not implemented.')
    },
    deleteMessageToSign: async () => {
        throw new Error('Function deleteMessageToSign not implemented.')
    },
})
