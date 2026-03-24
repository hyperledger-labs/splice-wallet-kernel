// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DamlTransaction_NodeSeed,
    Value,
} from '@canton-network/core-ledger-proto'
import { Encoder } from './client'
import { DamlEntityEncoder } from './damlEntityEncoder'

export class PrimitiveEncoder {
    static async encodeBool(value: boolean): Promise<Uint8Array> {
        return new Uint8Array([value ? 1 : 0])
    }

    static encodeInt(bit: '32', value: number): Promise<Uint8Array>
    static encodeInt(bit: '64', value: bigint | number): Promise<Uint8Array>
    static async encodeInt(
        bit: '32' | '64',
        value: bigint | number
    ): Promise<Uint8Array> {
        const num = BigInt(value)
        const binNum = +bit
        const buffer = new ArrayBuffer(binNum / 8)
        const view = new DataView(buffer)
        if (bit === '32') view.setInt32(0, value as number, false)
        else view.setBigInt64(0, num, false)
        return new Uint8Array(buffer)
    }

    static async encodeString(value: string = ''): Promise<Uint8Array> {
        const utf8Bytes = new TextEncoder().encode(value)
        return this.encodeBytes(utf8Bytes)
    }

    static async encodeBytes(value: Uint8Array): Promise<Uint8Array> {
        const length = await this.encodeInt('32', value.length)
        return Encoder.concatBytes(length, value)
    }

    static encodeHexString(value: string = ''): Promise<Uint8Array> {
        // Convert hex string to Uint8Array
        const bytes = new Uint8Array(value.length / 2)
        for (let i = 0; i < value.length; i += 2) {
            bytes[i / 2] = parseInt(value.slice(i, i + 2), 16)
        }
        return this.encodeBytes(bytes)
    }

    static async encodeOptional<T>(
        value: T | undefined | null,
        encodeFn: (arg: T) => Promise<Uint8Array>
    ): Promise<Uint8Array> {
        if (value === undefined || value === null) {
            return new Uint8Array([0]) // Return empty array for undefined fields
        } else {
            return Encoder.concatBytes(1, await encodeFn(value))
        }
    }

    static async encodeRepeated<T>(
        values: T[] = [],
        encodeFn: (value: T) => Promise<Uint8Array>
    ): Promise<Uint8Array> {
        const length = await this.encodeInt('32', values.length)
        const encodedValues = await Promise.all(values.map(encodeFn))
        return Encoder.concatBytes(length, ...encodedValues)
    }

    static findSeed(
        nodeId: string,
        nodeSeeds: DamlTransaction_NodeSeed[]
    ): Uint8Array | undefined {
        const seed = nodeSeeds.find(
            (seed) => seed.nodeId.toString() === nodeId
        )?.seed

        return seed
    }

    static async encodeValue(value: Value): Promise<Uint8Array> {
        if (value.sum.oneofKind === 'unit') {
            return Uint8Array.from([0]) // Unit value
        } else if (value.sum.oneofKind === 'bool') {
            return Encoder.concatBytes(
                Uint8Array.from([0x01]),
                await this.encodeBool(value.sum.bool)
            )
        } else if (value.sum.oneofKind === 'int64') {
            return Encoder.concatBytes(
                Uint8Array.from([0x02]),
                await this.encodeInt('64', parseInt(value.sum.int64))
            )
        } else if (value.sum.oneofKind === 'numeric') {
            return Encoder.concatBytes(
                Uint8Array.from([0x03]),
                await this.encodeString(value.sum.numeric)
            )
        } else if (value.sum.oneofKind === 'timestamp') {
            return Encoder.concatBytes(
                Uint8Array.from([0x04]),
                await this.encodeInt('64', BigInt(value.sum.timestamp))
            )
        } else if (value.sum.oneofKind === 'date') {
            return Encoder.concatBytes(
                Uint8Array.from([0x05]),
                await this.encodeInt('32', value.sum.date)
            )
        } else if (value.sum.oneofKind === 'party') {
            return Encoder.concatBytes(
                Uint8Array.from([0x06]),
                await this.encodeString(value.sum.party)
            )
        } else if (value.sum.oneofKind === 'text') {
            return Encoder.concatBytes(
                Uint8Array.from([0x07]),
                await this.encodeString(value.sum.text)
            )
        } else if (value.sum.oneofKind === 'contractId') {
            return Encoder.concatBytes(
                Uint8Array.from([0x08]),
                await this.encodeHexString(value.sum.contractId)
            )
        } else if (value.sum.oneofKind === 'optional') {
            return Encoder.concatBytes(
                Uint8Array.from([0x09]),
                await this.encodeOptional(
                    value.sum.optional.value,
                    this.encodeValue
                )
            )
        } else if (value.sum.oneofKind === 'list') {
            return Encoder.concatBytes(
                Uint8Array.from([0x0a]),
                await this.encodeRepeated(
                    value.sum.list.elements,
                    this.encodeValue
                )
            )
        } else if (value.sum.oneofKind === 'textMap') {
            return Encoder.concatBytes(
                Uint8Array.from([0x0b]),
                await this.encodeRepeated(
                    value.sum.textMap?.entries,
                    DamlEntityEncoder.encodeTextMapEntry
                )
            )
        } else if (value.sum.oneofKind === 'record') {
            return Encoder.concatBytes(
                Uint8Array.from([0x0c]),
                await this.encodeOptional(
                    value.sum.record.recordId,
                    DamlEntityEncoder.encodeIdentifier
                ),
                await this.encodeRepeated(
                    value.sum.record.fields,
                    DamlEntityEncoder.encodeRecordField
                )
            )
        } else if (value.sum.oneofKind === 'variant') {
            return Encoder.concatBytes(
                Uint8Array.from([0x0d]),
                await this.encodeOptional(
                    value.sum.variant.variantId,
                    DamlEntityEncoder.encodeIdentifier
                ),
                await this.encodeString(value.sum.variant.constructor),
                await this.encodeValue(value.sum.variant.value!)
            )
        } else if (value.sum.oneofKind === 'enum') {
            return Encoder.concatBytes(
                Uint8Array.from([0x0e]),
                await this.encodeOptional(
                    value.sum.enum.enumId,
                    DamlEntityEncoder.encodeIdentifier
                ),
                await this.encodeString(value.sum.enum.constructor)
            )
        } else if (value.sum.oneofKind === 'genMap') {
            return Encoder.concatBytes(
                Uint8Array.from([0x0f]),
                await this.encodeRepeated(
                    value.sum.genMap?.entries,
                    DamlEntityEncoder.encodeGenMapEntry
                )
            )
        }

        throw new Error('Unsupported value type: ' + JSON.stringify(value))
    }
}
