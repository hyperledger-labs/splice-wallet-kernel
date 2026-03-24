// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DamlTransaction,
    DamlTransaction_Node,
    DamlTransaction_NodeSeed,
    Metadata,
} from '@canton-network/core-ledger-proto'
import { PrimitiveEncoder } from './primitiveEncoder'
import { DamlEntityEncoder } from './damlEntityEncoder'

export class Encoder {
    static async sha256(message: string | Uint8Array) {
        const msg =
            typeof message === 'string'
                ? new TextEncoder().encode(message)
                : message

        return crypto.subtle
            .digest('SHA-256', new Uint8Array(msg))
            .then((hash) => new Uint8Array(hash))
    }

    static concatBytes(...args: (number | Uint8Array)[]): Uint8Array {
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

    static async encodeMetadata(metadata: Metadata) {
        return Encoder.concatBytes(
            Uint8Array.from([0x01]),
            await PrimitiveEncoder.encodeRepeated(
                metadata.submitterInfo?.actAs,
                PrimitiveEncoder.encodeString
            ),
            await PrimitiveEncoder.encodeString(
                metadata.submitterInfo?.commandId
            ),
            await PrimitiveEncoder.encodeString(metadata.transactionUuid),
            await PrimitiveEncoder.encodeInt('32', metadata.mediatorGroup),
            await PrimitiveEncoder.encodeString(metadata.synchronizerId),
            await PrimitiveEncoder.encodeOptional(
                metadata.minLedgerEffectiveTime,
                (v) => PrimitiveEncoder.encodeInt('64', v)
            ),
            await PrimitiveEncoder.encodeOptional(
                metadata.maxLedgerEffectiveTime,
                (v) => PrimitiveEncoder.encodeInt('64', v)
            ),
            await PrimitiveEncoder.encodeInt('64', metadata.preparationTime),
            await PrimitiveEncoder.encodeRepeated(
                metadata.inputContracts,
                DamlEntityEncoder.encodeInputContract
            )
        )
    }

    static async encodeTransaction(
        transaction: DamlTransaction,
        nodesDict: Record<string, DamlTransaction_Node>,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): Promise<Uint8Array> {
        return Encoder.concatBytes(
            await PrimitiveEncoder.encodeString(transaction.version),
            await PrimitiveEncoder.encodeRepeated(
                transaction.roots,
                DamlEntityEncoder.encodeNodeId(nodesDict, nodeSeeds)
            )
        )
    }
}
