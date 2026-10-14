// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TokenNamespaceConfig } from '../../namespace.js'
import type { PartyId } from '@canton-network/core-types'
import type { PreparedCommand } from '../../../transactions/types.js'
import {
    TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
    type TransferInstructionView as TransferInstructionViewV2,
} from '@canton-network/core-token-standard-v2'
import type { TransferParams } from '../../transfer/types.js'
import { ParsedURL, parseAssets } from '../../../utils/url.js'
import { findAsset } from '../../../asset/index.js'

export class TransferNamespace {
    constructor(private readonly sdkContext: TokenNamespaceConfig) {}

    async pending(partyId: PartyId) {
        return await this.sdkContext.tokenStandardService.listContractsByInterface<TransferInstructionViewV2>(
            TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
            partyId
        )
    }

    async accept(
        cid: string,
        actors: PartyId[],
        registryUrl: URL
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.v2.transfer.acceptTransferInstruction(
                cid,
                actors,
                new ParsedURL(this.sdkContext.commonCtx, registryUrl)
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async reject(
        cid: string,
        actors: PartyId[],
        registryUrl: URL
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.v2.transfer.rejectTransferInstruction(
                cid,
                actors,
                new ParsedURL(this.sdkContext.commonCtx, registryUrl)
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async withdraw(
        cid: string,
        actors: PartyId[],
        registryUrl: URL
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.v2.transfer.withdrawTransferInstruction(
                cid,
                actors,
                new ParsedURL(this.sdkContext.commonCtx, registryUrl)
            )
        return [{ ExerciseCommand }, disclosedContracts]
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
}
