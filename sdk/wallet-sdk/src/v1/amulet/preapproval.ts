// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../sdk.js'
import { Types } from '@canton-network/core-ledger-client'
import { Asset, findAsset } from '../registries/types.js'
import { PreapprovalParties } from './types.js'

const EMPTY_COMMAND_RESULT = [null, []] as const

export class Preapproval {
    /**
     * Commands for managing transfer preapprovals. The return result can be used as an argument to pass to signing and execution of a transaction.
     * Transfer preapprovals allow receivers to automatically accept incoming transfers.
     */
    public readonly command: {
        create: (args: { parties: PreapprovalParties; registryUrl?: URL }) => {
            CreateCommand: Types['CreateCommand']
        }
        renew: (args: {
            parties: PreapprovalParties
            inputUtxos?: string[]
        }) => Promise<
            | [
                  { ExerciseCommand: Types['ExerciseCommand'] },
                  Types['DisclosedContract'][],
              ]
            | typeof EMPTY_COMMAND_RESULT
        >
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
        private readonly defaultAmuletObject: Asset
    ) {
        this.command = {
            create: (args) => {
                const { parties, registryUrl } = args

                const amulet = registryUrl
                    ? findAsset(this.ctx.assetList, 'Amulet', registryUrl)
                    : this.defaultAmuletObject

                const command: { CreateCommand: Types['CreateCommand'] } = {
                    CreateCommand: {
                        templateId:
                            '#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal',
                        createArguments: {
                            provider:
                                parties?.provider ?? this.ctx.validatorParty,
                            receiver: parties.receiver,
                            expectedDso: amulet.admin,
                        },
                    },
                }

                return command
            },
            // FIXME: this needs further work
            renew: async (args) => {
                const { parties, inputUtxos } = args
                const preapprovalStatus = await this.fetchStatus(
                    parties.receiver
                )
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

                const { expiresAt, contractId, templateId } = preapprovalStatus

                const [command, disclosedContracts] =
                    await this.ctx.amuletService.renewTransferPreapproval(
                        contractId,
                        templateId,
                        parties?.provider ?? this.ctx.validatorParty,
                        await this.ctx.ledgerClient.getSynchronizerId(),
                        expiresAt,
                        inputUtxos
                    )

                return [{ ExerciseCommand: command }, disclosedContracts]
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
