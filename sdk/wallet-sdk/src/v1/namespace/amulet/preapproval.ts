// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { AssetBody, WalletSdkContext } from '../../sdk.js'
import { Types } from '@canton-network/core-ledger-client'
import { PreapprovalParties } from './types.js'

const EMPTY_COMMAND_RESULT = [null, []] as const

export class Preapproval {
    /**
     * Commands for managing transfer preapprovals. The return result can be used as an argument to pass to signing and execution of a transaction.
     * Transfer preapprovals allow receivers to automatically accept incoming transfers.
     */
    public readonly command: {
        create: (args: {
            parties: PreapprovalParties
            registryUrl?: URL
        }) => Promise<{
            CreateCommand: Types['CreateCommand']
        }>
        cancel: (args: {
            parties: PreapprovalParties
        }) => Promise<
            | [
                  { ExerciseCommand: Types['ExerciseCommand'] },
                  Types['DisclosedContract'][],
              ]
            | typeof EMPTY_COMMAND_RESULT
        >
    }

    constructor(
        private readonly ctx: WalletSdkContext,
        private readonly defaultAmuletObject: AssetBody
    ) {
        this.command = {
            create: async (args) => {
                const { parties, registryUrl } = args

                const amulet = registryUrl
                    ? await this.ctx.asset.find('Amulet', registryUrl)
                    : this.defaultAmuletObject

                const command: { CreateCommand: Types['CreateCommand'] } = {
                    CreateCommand: {
                        templateId:
                            '#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal',
                        createArguments: {
                            provider:
                                parties?.provider ?? this.ctx.validator.party,
                            receiver: parties.receiver,
                            expectedDso: amulet.admin,
                        },
                    },
                }

                return command
            },
            cancel: async (args) => {
                const { parties } = args
                const preapprovalStatus = await this.fetchStatus(
                    parties.receiver
                )
                if (
                    !preapprovalStatus ||
                    !preapprovalStatus.contractId ||
                    !preapprovalStatus.templateId
                ) {
                    this.ctx.logger.warn(
                        'Cannot create cancel command since no preapprovals have been found'
                    )
                    return EMPTY_COMMAND_RESULT
                }

                const { contractId, templateId } = preapprovalStatus

                const [command, disclosedContracts] =
                    await this.ctx.amuletService.cancelTransferPreapproval(
                        contractId,
                        templateId,
                        parties.receiver
                    )

                return [{ ExerciseCommand: command }, disclosedContracts]
            },
        }
    }

    /**
     * Renews a transfer preapproval, extending its expiration date.
     *
     * Note: This method is not part of the `command` object because it handles
     * the complete transaction flow internally, including signing and execution
     * by the provider (validator) party. Unlike `command.create` and `command.cancel`
     * which return commands for the caller to sign and execute, this method
     * submits the transaction directly using the provider's authorization.
     *
     * @param args - The renewal arguments
     * @param args.parties - The parties involved in the preapproval
     * @param args.parties.receiver - The receiver party whose preapproval should be renewed
     * @param args.parties.provider - Optional provider party (defaults to validator party)
     * @param args.expiresAt - The new expiration date for the preapproval
     * @param args.inputUtxos - Optional list of specific holding contract IDs to use as inputs
     * @returns A promise that resolves to the ledger submission result
     */
    public async renew(args: {
        parties: PreapprovalParties
        expiresAt: Date
        inputUtxos?: string[]
        synchronizerId?: string
    }) {
        const { parties, inputUtxos, expiresAt } = args
        const preapprovalStatus = await this.fetchStatus(parties.receiver)
        const provider = parties?.provider ?? this.ctx.validator.party
        const synchronizerId =
            args.synchronizerId ?? this.ctx.defaultSynchronizerId
        if (!synchronizerId)
            this.ctx.error.throw({
                type: 'Unexpected',
                message: 'Cannot obtain synchronizer id',
            })

        if (
            !preapprovalStatus ||
            !preapprovalStatus.contractId ||
            !preapprovalStatus.templateId
        ) {
            this.ctx.logger.warn(
                'Cannot create renew command since the preapproval status data is incomplete'
            )
            return EMPTY_COMMAND_RESULT
        }

        const { contractId, templateId } = preapprovalStatus

        const [command, disclosedContracts] =
            await this.ctx.amuletService.renewTransferPreapproval(
                contractId,
                templateId,
                provider,
                synchronizerId,
                expiresAt,
                inputUtxos
            )

        return await this.ctx.validator.internal.submit({
            commands: [{ ExerciseCommand: command }],
            disclosedContracts,
            synchronizerId,
            actAs: [provider],
        })
    }

    /**
     * Fetches the current status of a transfer preapproval for a given receiver party.
     * Polls the amulet service for up to 5 minutes to find the preapproval.
     *
     * @param receiverParty - The party ID of the receiver to check for preapproval status
     * @returns
     * - a promise that resolves to the preapproval status including expiration date, DSO party, contract ID, and template ID
     * - null when no results have been found
     */
    public async fetchStatus(receiverParty: PartyId) {
        const deadline = Date.now() + 5 * 60_000
        while (Date.now() < deadline) {
            const rawPreapproval = await this.ctx.amuletService
                .getTransferPreApprovalByParty(receiverParty)
                .catch(() => {})
            if (rawPreapproval) {
                const { dso, expiresAt } = rawPreapproval.contract.payload
                const contractId = rawPreapproval?.contract?.contract_id
                const templateId = rawPreapproval?.contract?.template_id

                return {
                    expiresAt: new Date(expiresAt),
                    dso,
                    contractId,
                    templateId,
                }
            }
        }
        this.ctx.logger.warn('No preapproval found')
        return null
    }
}
