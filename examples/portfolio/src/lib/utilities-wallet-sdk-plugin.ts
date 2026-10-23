// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    SDKPlugin,
    type PreparedCommand,
    type SDKPluginContext,
} from '@canton-network/wallet-sdk'

interface InstrumentAllowance {
    id: string
}

export interface TransferPreapproval {
    operator: string
    receiver: string
    instrumentAdmin: string
    instrumentAllowances: InstrumentAllowance[]
}

const EMPTY_COMMAND_RESULT = [null, []] as const

type TransferPreapprovalParty = TransferPreapproval['receiver']

export type TransferPreapprovalStatus = {
    contractId: string
    templateId: string
    synchronizerId: string
    payload: TransferPreapproval
}

export type FetchPreapprovalArgs = {
    receiver: TransferPreapprovalParty
    operator: TransferPreapprovalParty
    instrumentAdmin: TransferPreapprovalParty
    instrumentId: string
}

type FetchStatusOptions = {
    cancelled?: boolean
    timeoutMs?: number
    intervalMs?: number
}

type CancelArgs = FetchPreapprovalArgs & {
    actor?: TransferPreapprovalParty
}

type CancelCommandResult =
    | PreparedCommand<'ExerciseCommand'>
    | typeof EMPTY_COMMAND_RESULT

const TRANSFER_PREAPPROVAL_TEMPLATE_ID =
    '#utility-registry-app-v0:Utility.Registry.App.V0.Model.TransferPreapproval:TransferPreapproval'
const TRANSFER_PREAPPROVAL_WITHDRAW_CHOICE = 'TransferPreapproval_Withdraw'

export class WalletSDKUtilitiesPlugin extends SDKPlugin<'utilities'> {
    constructor(ctx: SDKPluginContext) {
        super('utilities', ctx)
    }

    public preapprovalTransfer = {
        create: (
            args: TransferPreapproval
        ): PreparedCommand<'CreateCommand'> => {
            const transferPreapprovalCommand: PreparedCommand<'CreateCommand'>[0] =
                {
                    CreateCommand: {
                        templateId: TRANSFER_PREAPPROVAL_TEMPLATE_ID,
                        createArguments: args,
                    },
                }

            this.ctx.logger.info(
                {
                    timestamp: new Date().toISOString(),
                    command: transferPreapprovalCommand,
                },
                'Successfully created transfer preapproval command. Executing...'
            )

            return [transferPreapprovalCommand, []]
        },

        /** Reads all preapprovals of a receiver. */
        list: async (
            receiver: TransferPreapprovalParty
        ): Promise<TransferPreapprovalStatus[]> =>
            this.readTransferPreapprovals(receiver),

        fetchQuick: async (
            args: FetchPreapprovalArgs
        ): Promise<TransferPreapprovalStatus | null> => {
            const preapprovals = await this.readTransferPreapprovals(
                args.receiver
            )
            const preapproval = findPreapproval(preapprovals, args)

            if (!preapproval) {
                this.ctx.logger.info(args, 'Preapproval is no longer visible')
                return null
            }

            return preapproval
        },

        fetchStatus: async (
            args: FetchPreapprovalArgs,
            options?: FetchStatusOptions
        ): Promise<TransferPreapprovalStatus | null> => {
            const {
                cancelled = false,
                timeoutMs = 5 * 60_000,
                intervalMs = 10_000,
            } = options ?? {}
            const deadline = Date.now() + timeoutMs

            while (Date.now() < deadline) {
                const preapproval =
                    await this.preapprovalTransfer.fetchQuick(args)

                if (cancelled) {
                    if (!preapproval) {
                        this.ctx.logger.info(
                            args,
                            'Preapproval is no longer visible'
                        )
                        return null
                    }

                    this.ctx.logger.debug(
                        args,
                        'Preapproval is still visible, polling again'
                    )
                } else if (preapproval) {
                    this.ctx.logger.info(
                        { ...args, contractId: preapproval.contractId },
                        'New preapproval is visible'
                    )
                    return preapproval
                } else {
                    this.ctx.logger.debug(
                        args,
                        'Fetch preapproval status failed, retrying again'
                    )
                }

                await new Promise((resolve) => setTimeout(resolve, intervalMs))
            }

            const result = cancelled
                ? 'preapproval to disappear'
                : 'preapproval to appear'
            this.ctx.error.throw({
                type: 'Unexpected',
                message: `Timed out after ${Math.floor(timeoutMs / 1000)} seconds, waiting for ${result}`,
            })
        },

        cancel: async (args: CancelArgs): Promise<CancelCommandResult> => {
            // Read once: if the preapproval is already gone, return the no-op
            // result rather than polling (fetchStatus would wait for it to
            // (re)appear and eventually throw).
            const preapprovalStatus =
                await this.preapprovalTransfer.fetchQuick(args)

            if (!preapprovalStatus) {
                this.ctx.logger.warn(
                    { receiver: args.receiver },
                    'Cannot create cancel command since no preapprovals have been found'
                )
                return EMPTY_COMMAND_RESULT
            }

            const transferPreapprovalCommand: PreparedCommand<'ExerciseCommand'>[0] =
                {
                    ExerciseCommand: {
                        templateId: preapprovalStatus.templateId,
                        contractId: preapprovalStatus.contractId,
                        choice: TRANSFER_PREAPPROVAL_WITHDRAW_CHOICE,
                        choiceArgument: {
                            actor: args.actor ?? args.receiver,
                        },
                    },
                }

            this.ctx.logger.info(
                {
                    timestamp: new Date().toISOString(),
                    command: transferPreapprovalCommand,
                },
                'Successfully created transfer preapproval cancel command. Executing...'
            )

            return [transferPreapprovalCommand, []]
        },
    }

    private async readTransferPreapprovals(
        receiver: TransferPreapprovalParty
    ): Promise<TransferPreapprovalStatus[]> {
        const contracts =
            await this.ctx.namespace.ledger.acsReader.paginated.raw.readJsContracts(
                {
                    templateIds: [TRANSFER_PREAPPROVAL_TEMPLATE_ID],
                    parties: [receiver],
                    filterByParty: true,
                    continueUntilCompletion: true,
                }
            )

        return contracts.flatMap((contract) => {
            const payload = contract.createArgument as
                | TransferPreapproval
                | undefined
            if (
                !contract.synchronizerId ||
                !contract.contractId ||
                !contract.templateId ||
                !payload
            ) {
                return []
            }

            return [
                {
                    contractId: contract.contractId,
                    templateId: contract.templateId,
                    synchronizerId: contract.synchronizerId,
                    payload,
                },
            ]
        })
    }
}

/** Returns the preapproval for an operator and instrument, or null. */
export const findPreapproval = (
    preapprovals: readonly TransferPreapprovalStatus[],
    args: FetchPreapprovalArgs
): TransferPreapprovalStatus | null =>
    preapprovals.find(({ payload }) => matchesPreapproval(payload, args)) ??
    null

/** Does this preapproval cover the instrument? No allowances means all. */
const matchesPreapproval = (
    payload: TransferPreapproval,
    args: FetchPreapprovalArgs
): boolean =>
    payload.receiver === args.receiver &&
    payload.operator === args.operator &&
    payload.instrumentAdmin === args.instrumentAdmin &&
    (payload.instrumentAllowances.length === 0 ||
        payload.instrumentAllowances.some(({ id }) => id === args.instrumentId))
