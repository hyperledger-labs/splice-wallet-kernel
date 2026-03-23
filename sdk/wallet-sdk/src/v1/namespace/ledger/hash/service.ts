// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DamlTransaction,
    DamlTransaction_Node,
    PreparedTransaction as PreparedTransactionForHash,
} from '@canton-network/core-ledger-proto'
import { WalletSdkContext } from 'src/v1/sdk'
import { Converter } from './converter'
import { Encoder } from './encoder'

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
                Encoder.preparedTransactionHashPurpose,
                await Encoder.encodeMetadata(preparedTransaction.metadata!)
            )
        )

        const msg = Encoder.concatBytes(
            Encoder.preparedTransactionHashPurpose,
            Encoder.hashingSchemeVersion,
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
                Encoder.preparedTransactionHashPurpose,
                encodedTransaction
            )
        )

        return hash
    }
}
