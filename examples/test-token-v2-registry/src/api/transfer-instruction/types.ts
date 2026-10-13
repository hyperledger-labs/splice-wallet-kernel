// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard'

type TransferFactoryPath = '/registry/transfer-instruction/v1/transfer-factory'

type TransferInstructionPaths = OffLedger.TransferInstructionV1.paths
type TransferFactoryOperation =
    TransferInstructionPaths[TransferFactoryPath]['post']
type TransferFactoryRequestBody =
    TransferFactoryOperation['requestBody']['content']['application/json']

export type TransferFactoryChoiceArguments = {
    sender: string
    receiver: string
    transferKind?: 'self' | 'offer' | 'direct' | undefined
}

type OverriddenTransferFactoryRequestBody = Omit<
    TransferFactoryRequestBody,
    'choiceArguments'
> & {
    choiceArguments: TransferFactoryChoiceArguments
}

export type GetTransferFactoryOperationWithChoiceArgsOverride = Omit<
    TransferFactoryOperation,
    'requestBody'
> & {
    requestBody: {
        content: {
            'application/json': OverriddenTransferFactoryRequestBody
        }
    }
}

export type TransferInstructionPathsWithChoiceArgsOverride = Omit<
    TransferInstructionPaths,
    TransferFactoryPath
> & {
    [K in TransferFactoryPath]: Omit<TransferInstructionPaths[K], 'post'> & {
        post: GetTransferFactoryOperationWithChoiceArgsOverride
    }
}
