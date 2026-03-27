// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Metadata,
    Metadata_InputContract,
} from '@canton-network/core-ledger-proto'
import { WalletSdkContext } from '../../../../../sdk.js'
import { Encoder } from './encoder.js'
import { PREPARED_TRANSACTION_HASH_PURPOSE } from '../const.js'
import { HashEncoder } from './types.js'
import { PrimitiveEncoder } from './primitiveEncoder.js'
import { CollectionEncoder } from './collectionEncoder.js'
import { TransactionEncoder } from './transactionEncoder.js'

export class MetadataEncoder extends Encoder implements HashEncoder<Metadata> {
    private readonly encodePrimitive: PrimitiveEncoder
    private readonly encodeCollection: CollectionEncoder
    private readonly encodeTransaction: TransactionEncoder

    constructor(protected readonly ctx: WalletSdkContext) {
        super(ctx)
        this.encodePrimitive = new PrimitiveEncoder(ctx)
        this.encodeCollection = new CollectionEncoder(ctx)
        this.encodeTransaction = new TransactionEncoder(ctx)
    }

    private readonly metadata = async (value: Metadata) => {
        const {
            submitterInfo,
            transactionUuid,
            mediatorGroup,
            synchronizerId,
            minLedgerEffectiveTime,
            maxLedgerEffectiveTime,
            preparationTime,
            inputContracts,
        } = value
        if (submitterInfo === undefined)
            this.ctx.error.throw({
                message: 'Some values passed to encode the node are undefined',
                type: 'CantonError',
            })

        return this.concatBytes(
            0x01,
            this.encodeCollection.repeatedSync(
                submitterInfo.actAs,
                (str: string) => this.encodePrimitive.string(str)
            ),
            this.encodePrimitive.string(submitterInfo.commandId),
            this.encodePrimitive.string(transactionUuid),
            this.encodePrimitive.int32(mediatorGroup),
            this.encodePrimitive.string(synchronizerId),
            this.encodeCollection.optionalSync(
                minLedgerEffectiveTime,
                (val: bigint | number) => this.encodePrimitive.int64(val)
            ),
            this.encodeCollection.optionalSync(
                maxLedgerEffectiveTime,
                (val: bigint | number) => this.encodePrimitive.int64(val)
            ),
            this.encodePrimitive.int64(preparationTime),
            await this.encodeCollection.repeated(
                inputContracts,
                this.inputContract
            )
        )
    }

    private readonly inputContract = async (value: Metadata_InputContract) => {
        const { createdAt, contract } = value
        if (contract.oneofKind !== 'v1')
            this.ctx.error.throw({
                message: 'Unsupported contract version provided',
                type: 'SDKOperationUnsupported',
            })
        return this.concatBytes(
            await this.encodeTransaction.nodeType.create({
                node: contract.v1,
            }),
            this.encodePrimitive.int64(createdAt)
        )
    }

    public async hash(value: Metadata) {
        return this.sha256(
            this.concatBytes(
                PREPARED_TRANSACTION_HASH_PURPOSE,
                await this.metadata(value)
            )
        )
    }
}
