// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { PreparedCommand } from '@canton-network/wallet-sdk'
import { utilityOperatorQueryOptions } from './query-options'
import { queryKeys } from './query-keys'
import type { WalletSdk } from './useWalletSdk'
import { submitViaProvider } from '@lib/submit'
import type { PreapprovalRow } from '../types/preapprovals'

type TogglePreapprovalInput = {
    row: PreapprovalRow
    enabled: boolean
}

type UseTogglePreapprovalArgs = {
    primaryParty: string | undefined
    sdk: WalletSdk
}

export function useTogglePreapproval({
    primaryParty,
    sdk,
}: UseTogglePreapprovalArgs) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ row, enabled }: TogglePreapprovalInput) => {
            if (!primaryParty) {
                throw new Error('Primary party is unavailable')
            }

            if (!sdk) {
                throw new Error('Wallet SDK is not ready')
            }

            if (row.kind === 'amulet') {
                if (enabled) {
                    const command = await sdk.amulet.preapproval.command.create(
                        {
                            parties: { receiver: primaryParty },
                        }
                    )

                    await submitPreapprovalCommand([command, []], primaryParty)
                    await sdk.amulet.preapproval.fetchStatus(primaryParty)
                    return
                }

                const preparedCommand =
                    await sdk.amulet.preapproval.command.cancel({
                        parties: { receiver: primaryParty },
                    })

                await submitPreapprovalCommand(preparedCommand, primaryParty)
                await sdk.amulet.preapproval.fetchStatus(primaryParty, {
                    cancelled: true,
                })
                return
            }

            const operator = await queryClient.ensureQueryData(
                utilityOperatorQueryOptions({
                    registryPartyId: row.registryPartyId,
                    registryUrl: row.registryUrl,
                })
            )

            const args = {
                receiver: primaryParty,
                operator,
                instrumentAdmin: row.registryPartyId,
                instrumentId: row.instrument.id,
            }

            if (enabled) {
                const preparedCommand =
                    sdk.utilities.preapprovalTransfer.create({
                        receiver: primaryParty,
                        operator,
                        instrumentAdmin: row.registryPartyId,
                        instrumentAllowances: [{ id: row.instrument.id }],
                    })

                await submitPreapprovalCommand(preparedCommand, primaryParty)
                await sdk.utilities.preapprovalTransfer.fetchStatus(args)
                return
            }

            const preparedCommand =
                await sdk.utilities.preapprovalTransfer.cancel(args)

            await submitPreapprovalCommand(preparedCommand, primaryParty)
            await sdk.utilities.preapprovalTransfer.fetchStatus(args, {
                cancelled: true,
            })
        },
        onSuccess: async (_data, variables) => {
            // The read is shared, so other rows this contract covers
            // refresh too.
            await queryClient.invalidateQueries({
                queryKey:
                    variables.row.kind === 'amulet'
                        ? queryKeys.walletConnection.preapprovals.amulet(
                              primaryParty
                          )
                        : queryKeys.walletConnection.preapprovals.utility(
                              primaryParty
                          ),
            })
            toast.success(
                variables.enabled
                    ? 'Preapproval enabled'
                    : 'Preapproval disabled'
            )
        },
        onError: (error) => {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to update preapproval'
            )
        },
    })
}

async function submitPreapprovalCommand(
    [command, disclosedContracts]:
        | PreparedCommand
        | readonly [null, readonly []],
    receiver: string
) {
    if (!command) return
    await submitViaProvider([command, [...disclosedContracts]], receiver)
}
