// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DamlTransaction,
    DamlTransaction_Node,
    PreparedTransaction as PreparedTransactionForHash,
} from '@canton-network/core-ledger-proto'
import { WalletSdkContext } from '../../../sdk.js'
import { Converter } from './converter.js'
import { Encoder } from './encoder/client.js'
import {
    HASHING_SCHEME_VERSION,
    PREPARED_TRANSACTION_HASH_PURPOSE,
} from './encoder/index.js'

export class HashService {
    constructor(private readonly ctx: WalletSdkContext) {}

    public async calculate(args: {
        preparedTransaction: PreparedTransactionForHash
        format: 'base64' | 'hex'
    }) {
        const { format = 'base64', preparedTransaction } = args

        const nodesDict: Record<string, DamlTransaction_Node> = {}
        const nodes = preparedTransaction.transaction?.nodes || []
        for (const node of nodes) {
            nodesDict[node.nodeId] = node
        }

        const transactionHash = await this.hashTransaction(
            preparedTransaction.transaction!,
            nodesDict
        )
        const metadataHash = await Encoder.sha256(
            Encoder.concatBytes(
                PREPARED_TRANSACTION_HASH_PURPOSE,
                await Encoder.encodeMetadata(preparedTransaction.metadata!)
            )
        )

        const msg = Encoder.concatBytes(
            PREPARED_TRANSACTION_HASH_PURPOSE,
            HASHING_SCHEME_VERSION,
            transactionHash,
            metadataHash
        )

        const arrayBufferHash = await Encoder.sha256(msg)
        const converted = new Converter(arrayBufferHash)
        switch (format) {
            case 'hex':
                return converted.toHex()
            case 'base64':
            default:
                return converted.toBase64()
        }
    }

    private async hashTransaction(
        transaction: DamlTransaction,
        nodesDict: Record<string, DamlTransaction_Node>
    ): Promise<Uint8Array> {
        const encodedTransaction = await Encoder.encodeTransaction(
            transaction,
            nodesDict,
            transaction.nodeSeeds
        )

        const hash = await Encoder.sha256(
            Encoder.concatBytes(
                PREPARED_TRANSACTION_HASH_PURPOSE,
                encodedTransaction
            )
        )

        return hash
    }
}
