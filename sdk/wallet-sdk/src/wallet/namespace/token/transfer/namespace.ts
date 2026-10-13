// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TokenNamespaceConfig } from '../namespace.js'
import type { PartyId } from '@canton-network/core-types'
import {
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    type TransferInstructionView,
} from '@canton-network/core-token-standard'
import type { TransferAllocationChoiceParams, TransferParams } from './types.js'
import type { PreparedCommand } from '../../transactions/types.js'
import { ProxyDelegationNamespace } from './proxyDelegation.js'
import { findAsset } from '../../asset/index.js'
import { parseAssets, ParsedURL } from '../../utils/url.js'

export class TransferNamespace {
    public readonly delegatedProxy: ProxyDelegationNamespace
    constructor(private readonly sdkContext: TokenNamespaceConfig) {
        this.delegatedProxy = new ProxyDelegationNamespace(sdkContext)
    }

    async pending(partyId: PartyId) {
        return await this.sdkContext.tokenStandardService.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            partyId
        )
    }

    async accept(
        params: TransferAllocationChoiceParams
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createAcceptTransferInstruction(
                params.transferInstructionCid,
                new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async withdraw(
        params: TransferAllocationChoiceParams
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createWithdrawTransferInstruction(
                params.transferInstructionCid,
                new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async reject(
        params: TransferAllocationChoiceParams
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createRejectTransferInstruction(
                params.transferInstructionCid,
                new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async createV2(
        params: TransferParams
    ): Promise<PreparedCommand<'ExerciseCommand'>> {
        const assets = parseAssets(
            this.sdkContext.commonCtx,
            await this.sdkContext.tokenStandardService.registriesToAssets(
                this.sdkContext.registryUrls
            )
        )

        const asset = findAsset(
            assets,
            params.instrumentId,
            this.sdkContext.commonCtx.error,
            new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
        )

        const [transferCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.v2.transfer.createTransfer(
                {
                    sender: this.sdkContext.tokenStandardService.core.toBasicAccount(
                        params.sender
                    ),
                    receiver:
                        this.sdkContext.tokenStandardService.core.toBasicAccount(
                            params.recipient
                        ),
                    amount: params.amount,
                    instrumentAdmin: asset.admin,
                    instrumentId: asset.id,
                },
                asset.registryUrl
            )
        return [{ ExerciseCommand: transferCommand }, disclosedContracts]
    }

    async create(
        params: TransferParams
    ): Promise<PreparedCommand<'ExerciseCommand'>> {
        const assets = parseAssets(
            this.sdkContext.commonCtx,
            await this.sdkContext.tokenStandardService.registriesToAssets(
                this.sdkContext.registryUrls
            )
        )

        const asset = findAsset(
            assets,
            params.instrumentId,
            this.sdkContext.commonCtx.error,
            new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
        )

        const [transferCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createTransfer(
                params.sender,
                params.recipient,
                params.amount,
                asset.admin,
                asset.id,
                asset.registryUrl,
                params.inputUtxos,
                params.memo,
                params.expirationDate,
                params.meta
            )

        return [{ ExerciseCommand: transferCommand }, disclosedContracts]
    }
}
