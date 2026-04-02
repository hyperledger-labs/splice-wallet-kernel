// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { TokenNamespaceConfig } from '../../../sdk.js'
import { Ledger } from '../../ledger/client.js'
import {
    Beneficiaries,
    FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
} from '@canton-network/core-token-standard'
import { localNetStaticConfig } from '../../../../config.js'
import { Types } from '@canton-network/core-ledger-client'
import { FeaturedAppRight } from '../../amulet/types.js'

export class ProxyDelegationService {
    private readonly ledger: Ledger
    constructor(private readonly ctx: TokenNamespaceConfig) {
        this.ledger = new Ledger(ctx.commonCtx)
    }

    public async create(delegateParty: PartyId) {
        const command = {
            CreateCommand: {
                templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                createArguments: {
                    provider: this.ctx.validatorParty,
                    delegate: delegateParty,
                },
            },
        }

        return await this.ledger.internal.submit({
            commands: [command],
            actAs: [this.ctx.validatorParty],
        })
    }

    public commands = {
        accept: async (args: {
            proxyCid: string
            transferInstructionCid: string
            registryUrl?: URL
            featuredAppRight: FeaturedAppRight
            beneficiaries?: Beneficiaries[]
        }): Promise<
            [
                { ExerciseCommand: Types['ExerciseCommand'] },
                Types['DisclosedContract'][],
            ]
        > => {
            const {
                transferInstructionCid,
                proxyCid,
                registryUrl,
                featuredAppRight,
                beneficiaries = [],
            } = args
            const [acceptTransferInstructionContext, disclosedContracts] =
                await this.ctx.tokenStandardService.exerciseDelegateProxyTransferInstructionAccept(
                    this.ctx.validatorParty,
                    proxyCid,
                    transferInstructionCid,
                    registryUrl?.href ??
                        localNetStaticConfig.LOCALNET_REGISTRY_API_URL.href,
                    featuredAppRight.contract_id
                )

            const featuredAppDisclosedContract = {
                templateId: featuredAppRight.template_id,
                contractId: featuredAppRight.contract_id,
                createdEventBlob: featuredAppRight.created_event_blob!,
                synchronizerId: this.ctx.commonCtx.defaultSynchronizerId,
            }

            const choiceArgs = structuredClone(
                acceptTransferInstructionContext.choiceArgument
            ) as {
                proxyArg: {
                    beneficiaries: Beneficiaries[]
                }
            }

            choiceArgs.proxyArg.beneficiaries = [
                ...beneficiaries,
                {
                    beneficiary: this.ctx.validatorParty,
                    weight: beneficiaries.reduce(
                        (acc, beneficiary) => acc - beneficiary.weight,
                        1
                    ),
                },
            ]

            return [
                {
                    ExerciseCommand: {
                        templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                        contractId: proxyCid,
                        choice: 'DelegateProxy_TransferInstruction_Accept',
                        choiceArgument: choiceArgs,
                    },
                },
                [...disclosedContracts, featuredAppDisclosedContract],
            ]
        },
    }
}
