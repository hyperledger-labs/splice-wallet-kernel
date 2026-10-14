// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { WrappedCommand } from '@canton-network/core-ledger-client-types'
import type { HoldingView as HoldingViewV1 } from '@canton-network/core-token-standard'
import type { HoldingView as HoldingViewV2 } from '@canton-network/core-token-standard-v2'
import type { SDKInterface } from '@canton-network/wallet-sdk'
import { readFileSync } from 'fs'
import path from 'path'

type RequiredHoldingViewProps<
    HoldingView extends HoldingViewV1 | HoldingViewV2,
> = Omit<HoldingView, 'lock' | 'meta' | 'instrumentId'> & {
    instrumentId: Pick<HoldingView['instrumentId'], 'admin'>
}
type OptionalHoldingViewProps<
    HoldingView extends HoldingViewV1 | HoldingViewV2,
> = Partial<
    Pick<
        HoldingView,
        Exclude<keyof HoldingView, keyof RequiredHoldingViewProps<HoldingView>>
    >
>
export type TestTokenHoldingView<
    HoldingView extends HoldingViewV1 | HoldingViewV2,
> = RequiredHoldingViewProps<HoldingView> &
    OptionalHoldingViewProps<HoldingView>

export const vetDarFactory =
    (pathToDar: string, packageId: string) =>
    async (
        sdk: SDKInterface,
        synchronizerId?: Parameters<SDKInterface['ledger']['dar']['upload']>[2]
    ) => {
        const darFile = path.join(import.meta.dirname, pathToDar)
        const darBytes = readFileSync(darFile)

        await sdk.ledger.dar.upload(darBytes, packageId, synchronizerId, true)
    }

export const generateCommand = {
    create<CreateArgs>(templateId: string) {
        return (
            createArguments: CreateArgs
        ): WrappedCommand<'CreateCommand'> => ({
            CreateCommand: {
                templateId,
                createArguments,
            },
        })
    },
    exercise(templateId: string, choice: string) {
        return (
            args: Pick<
                WrappedCommand<'ExerciseCommand'>['ExerciseCommand'],
                'contractId' | 'choiceArgument'
            >
        ): WrappedCommand<'ExerciseCommand'> => ({
            ExerciseCommand: {
                templateId,
                contractId: args.contractId,
                choice,
                choiceArgument: args.choiceArgument,
            },
        })
    },
}
