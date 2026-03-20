// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DamlTransaction,
    DamlTransaction_Node,
    HashingSchemeVersion,
    PreparedTransaction as PreparedTransactionForHash,
} from '@canton-network/core-ledger-proto'
import { WalletSdkContext } from 'src/v1/sdk'

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
        const metadataHash = await this.sha256(
            await this.mkByteArray(
                this.preparedTransactionHashPurpose,
                await encodeMetadata(preparedTransaction.metadata)
            )
        )

        const msg = await this.mkByteArray(
            this.preparedTransactionHashPurpose,
            this.hashingSchemeVersion,
            transactionHash,
            metadataHash
        )

        const arrayBufferHash = await this.sha256(msg)
        switch (format) {
            case 'hex':
                return this.toHex(arrayBufferHash)
            case 'base64':
            default:
                return this.toBase64(arrayBufferHash)
        }
    }

    private async sha256(message: string | Uint8Array) {
        const msg =
            typeof message === 'string'
                ? new TextEncoder().encode(message)
                : message

        return crypto.subtle
            .digest('SHA-256', new Uint8Array(msg))
            .then((hash) => new Uint8Array(hash))
    }

    private toHex(bytes: Uint8Array): string {
        return Array.from(bytes)
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('')
    }

    private toBase64(data: Uint8Array): string {
        let binaryString = ''
        const len = data.byteLength
        for (let i = 0; i < len; i++) {
            binaryString += String.fromCharCode(data[i])
        }
        return btoa(binaryString)
    }

    private async hashTransaction(
        transaction: DamlTransaction,
        nodesDict: Record<string, DamlTransaction_Node>
    ): Promise<Uint8Array> {
        const encodedTransaction = await encodeTransaction(
            transaction,
            nodesDict,
            transaction.nodeSeeds
        )

        const hash = await this.sha256(
            await this.mkByteArray(
                this.preparedTransactionHashPurpose,
                encodedTransaction
            )
        )

        return hash
    }

    private readonly preparedTransactionHashPurpose = Uint8Array.from([
        0x00, 0x00, 0x00, 0x30,
    ])

    private readonly hashingSchemeVersion = Uint8Array.from([
        HashingSchemeVersion.V2,
    ])

    private async mkByteArray(
        ...args: (number | Uint8Array)[]
    ): Promise<Uint8Array> {
        const normalizedArgs: Uint8Array[] = args.map((arg) => {
            if (typeof arg === 'number') {
                return new Uint8Array([arg])
            } else {
                return arg
            }
        })

        let totalLength = 0
        normalizedArgs.forEach((arg) => {
            totalLength += arg.length
        })

        const mergedArray = new Uint8Array(totalLength)
        let offset = 0

        normalizedArgs.forEach((arg) => {
            mergedArray.set(arg, offset)
            offset += arg.length
        })

        return mergedArray
    }
}
