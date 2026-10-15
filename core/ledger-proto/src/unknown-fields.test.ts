// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { BinaryWriter, WireType } from '@protobuf-ts/runtime'
import { describe, expect, it } from 'vitest'
import { Empty } from './_proto/google/protobuf/empty.js'
import { decodeUnknownFields } from './unknown-fields.js'

function decode(writer: BinaryWriter) {
    return decodeUnknownFields(Empty.fromBinary(writer.finish()))
}

describe('decodeUnknownFields', () => {
    it('returns undefined when there are no unknown fields', () => {
        expect(decodeUnknownFields(Empty.create())).toBeUndefined()
    })

    it('decodes varints and fixed-width integers', () => {
        const writer = new BinaryWriter()
        writer.tag(1, WireType.Varint).uint64(150)
        writer.tag(2, WireType.Bit32).fixed32(123456)
        writer.tag(3, WireType.Bit64).fixed64(Number.MAX_SAFE_INTEGER)

        expect(decode(writer)).toEqual({
            1: 150,
            2: 123456,
            3: Number.MAX_SAFE_INTEGER,
        })
    })

    it('preserves integers above the safe range as decimal strings', () => {
        const writer = new BinaryWriter()
        writer.tag(1, WireType.Varint).uint64('18446744073709551615')
        writer.tag(2, WireType.Bit64).fixed64('9007199254740993')

        expect(decode(writer)).toEqual({
            1: '18446744073709551615',
            2: '9007199254740993',
        })
    })

    it('decodes printable UTF-8 strings, including whitespace and empty strings', () => {
        const writer = new BinaryWriter()
        writer.tag(1, WireType.LengthDelimited).string('alice')
        writer.tag(2, WireType.LengthDelimited).string('\u00e9\tline\nbreak\r')
        writer.tag(3, WireType.LengthDelimited).string('')

        expect(decode(writer)).toEqual({
            1: 'alice',
            2: '\u00e9\tline\nbreak\r',
            3: '',
        })
    })

    it('groups repeated fields in wire order', () => {
        const writer = new BinaryWriter()
        writer.tag(1, WireType.LengthDelimited).string('alice')
        writer.tag(2, WireType.Varint).uint32(42)
        writer.tag(1, WireType.LengthDelimited).string('bob')
        writer.tag(1, WireType.LengthDelimited).string('charlie')

        expect(decode(writer)).toEqual({
            1: ['alice', 'bob', 'charlie'],
            2: 42,
        })
    })

    it('decodes nested messages and treats ambiguous packed integers as bytes', () => {
        const writer = new BinaryWriter()
        writer.tag(20, WireType.LengthDelimited).fork()
        writer.tag(1, WireType.LengthDelimited).string('alice')
        writer.tag(1, WireType.LengthDelimited).string('bob')
        writer.join()
        writer.tag(21, WireType.LengthDelimited).fork()
        for (const value of [1, 2, 3]) writer.int32(value)
        writer.join()
        writer.tag(999, WireType.Varint).uint32(1)

        expect(decode(writer)).toEqual({
            20: { 1: ['alice', 'bob'] },
            21: 'AQID',
            999: 1,
        })
    })

    it('groups repeated nested messages without flattening them', () => {
        const writer = new BinaryWriter()
        for (const value of [1, 2, 3]) {
            writer.tag(1, WireType.LengthDelimited).fork()
            writer.tag(1, WireType.Varint).uint32(value)
            writer.join()
        }

        expect(decode(writer)).toEqual({ 1: [{ 1: 1 }, { 1: 2 }, { 1: 3 }] })
    })

    it('prefers printable text over a possible nested message', () => {
        const writer = new BinaryWriter()
        // These bytes are also a valid message: field 4, varint 65.
        writer.tag(1, WireType.LengthDelimited).string(' A')

        expect(decode(writer)).toEqual({ 1: ' A' })
    })

    it.each([
        { bytes: [0xff], base64: '/w==', reason: 'invalid UTF-8' },
        { bytes: [0x00], base64: 'AA==', reason: 'a control character' },
        { bytes: [0x7f], base64: 'fw==', reason: 'a DEL character' },
        {
            bytes: [0xc2, 0x85],
            base64: 'woU=',
            reason: 'a C1 control character',
        },
    ])('falls back to base64 for $reason', ({ bytes, base64 }) => {
        const writer = new BinaryWriter()
        writer.tag(1, WireType.LengthDelimited).bytes(Uint8Array.from(bytes))

        expect(decode(writer)).toEqual({ 1: base64 })
    })

    it('limits nested message decoding to 32 levels', () => {
        const writer = new BinaryWriter()
        for (let i = 0; i < 33; i++) {
            writer.tag(1, WireType.LengthDelimited).fork()
        }
        writer.tag(1, WireType.Varint).uint32(1)
        for (let i = 0; i < 33; i++) writer.join()

        let expected: object = { 1: 'CAE=' }
        for (let i = 0; i < 32; i++) expected = { 1: expected }
        expect(decode(writer)).toEqual(expected)
    })
})
