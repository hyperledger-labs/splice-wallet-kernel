// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    BinaryReader,
    UnknownFieldHandler,
    WireType,
    base64encode,
} from '@protobuf-ts/runtime'

/**
 * Best-effort, schema-less representation of protobuf fields, keyed by field number.
 * Similar to `protoc --decode_raw`: field names and exact types are unknown.
 */
export type RawFields = { [fieldNo: string]: RawValue | RawValue[] }
export type RawValue = number | string | RawFields

const MAX_DEPTH = 32
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
const PRINTABLE_CONTROLS = /[\t\n\r]/g
const CONTROL = /\p{Cc}/u

/**
 * Decodes the unknown fields stored on a decoded message without a schema.
 * Length-delimited values are shown as a printable string if possible,
 * otherwise as a nested message, otherwise as base64.
 *
 * @param message - A message decoded with unknown fields kept (the default)
 * @returns The unknown fields keyed by field number, or `undefined` if there are none
 */
export function decodeUnknownFields(message: object): RawFields | undefined {
    const fields = UnknownFieldHandler.list(message)
    if (fields.length === 0) return undefined

    return groupByFieldNo(
        fields.map(({ no, wireType, data }) => {
            try {
                return [no, readValue(new BinaryReader(data), wireType, 0)]
            } catch {
                return [no, base64encode(data)]
            }
        })
    )
}

function readValue(
    reader: BinaryReader,
    wireType: WireType,
    depth: number
): RawValue {
    switch (wireType) {
        case WireType.Varint:
            return toSafeNumber(reader.uint64().toString())
        case WireType.Bit64:
            return toSafeNumber(reader.fixed64().toString())
        case WireType.Bit32:
            return reader.fixed32()
        case WireType.LengthDelimited:
            return decodeBytes(reader.bytes(), depth)
        default:
            return base64encode(reader.skip(wireType))
    }
}

function decodeBytes(bytes: Uint8Array, depth: number): RawValue {
    const text = tryDecodeText(bytes)
    if (text !== undefined) return text

    if (depth < MAX_DEPTH) {
        const message = tryDecodeMessage(bytes, depth + 1)
        if (message !== undefined) return message
    }

    return base64encode(bytes)
}

function tryDecodeText(bytes: Uint8Array): string | undefined {
    let text: string
    try {
        text = utf8.decode(bytes)
    } catch {
        return undefined
    }
    return isPrintable(text) ? text : undefined
}

function isPrintable(text: string): boolean {
    return !CONTROL.test(text.replace(PRINTABLE_CONTROLS, ''))
}

function tryDecodeMessage(
    bytes: Uint8Array,
    depth: number
): RawFields | undefined {
    try {
        const reader = new BinaryReader(bytes)
        const fields: [number, RawValue][] = []
        while (reader.pos < reader.len) {
            const [no, wireType] = reader.tag()
            fields.push([no, readValue(reader, wireType, depth)])
        }
        return groupByFieldNo(fields)
    } catch {
        return undefined
    }
}

function groupByFieldNo(fields: [number, RawValue][]): RawFields {
    const result: RawFields = {}
    for (const [no, value] of fields) {
        const existing = result[no]
        if (existing === undefined) {
            result[no] = value
        } else if (Array.isArray(existing)) {
            existing.push(value)
        } else {
            result[no] = [existing, value]
        }
    }
    return result
}

function toSafeNumber(value: string): number | string {
    const number = Number(value)
    return Number.isSafeInteger(number) ? number : value
}
