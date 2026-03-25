// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DamlTransaction_Node,
    PreparedTransaction,
} from '@canton-network/core-ledger-proto'
import { WalletSdkContext } from '../../../sdk.js'
import { Converter } from './converter.js'
import { Encoder } from './util/encoder/encoder.js'
import {
    HASHING_SCHEME_VERSION,
    PREPARED_TRANSACTION_HASH_PURPOSE,
} from './util/index.js'

export class HashService {
    constructor(private readonly ctx: WalletSdkContext) {}

    async calculate(args: {
        preparedTransaction: string | PreparedTransaction
        format?: 'base64' | 'hex'
    }) {
        const {
            format = 'base64',
            preparedTransaction: unparsedPreparedTransaction,
        } = args

        const preparedTransaction =
            typeof unparsedPreparedTransaction === 'string'
                ? this.decodePreparedTransaction(unparsedPreparedTransaction)
                : unparsedPreparedTransaction

        const nodesDict: Record<string, DamlTransaction_Node> = {}
        const nodes = preparedTransaction.transaction?.nodes || []
        for (const node of nodes) {
            nodesDict[node.nodeId] = node
        }

        console.log('ABOUT TO ENCODE')

        const encodedTransaction = await Encoder.encodeTransaction(
            preparedTransaction.transaction!,
            nodesDict,
            preparedTransaction.transaction!.nodeSeeds
        )

        console.log('ENCODED TRANSACTION')

        const transactionHash = await Encoder.sha256(
            Encoder.concatBytes(
                PREPARED_TRANSACTION_HASH_PURPOSE,
                encodedTransaction
            )
        )

        console.log('TRANSACTION HASH')

        const metadataHash = await Encoder.sha256(
            Encoder.concatBytes(
                PREPARED_TRANSACTION_HASH_PURPOSE,
                await Encoder.encodeMetadata(preparedTransaction.metadata!)
            )
        )

        console.log('METADATA HASH')

        const msg = Encoder.concatBytes(
            PREPARED_TRANSACTION_HASH_PURPOSE,
            HASHING_SCHEME_VERSION,
            transactionHash,
            metadataHash
        )

        const arrayBufferHash = await Encoder.sha256(msg)
        const convertedHash = new Converter(arrayBufferHash)
        switch (format) {
            case 'hex':
                return convertedHash.toHex()
            case 'base64':
            default:
                return convertedHash.toBase64()
        }
    }

    private decodePreparedTransaction(preparedTransaction: string) {
        const binaryString = atob(preparedTransaction)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        return PreparedTransaction.fromBinary(bytes)
    }
}
