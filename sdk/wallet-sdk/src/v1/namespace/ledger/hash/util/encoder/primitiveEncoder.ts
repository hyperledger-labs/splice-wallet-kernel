// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from 'src/v1/sdk'
import { Encoder } from './encoder'

export type HexString = string & { readonly __brand: unique symbol }

function isHexString(value: string): value is HexString {
    return /^[0-9a-fA-F]*$/.test(value)
}

export class PrimitiveEncoder extends Encoder {
    constructor(protected ctx: WalletSdkContext) {
        super(ctx)
    }

    public bool(value: boolean) {
        return value ? this.existingByte() : this.emptyByte()
    }

    private int(bit: '32', value: number): Uint8Array
    private int(bit: '64', value: bigint | number): Uint8Array
    private int(bit: '32' | '64', value: bigint | number) {
        const num = BigInt(value)
        const binNum = +bit
        const buffer = new ArrayBuffer(binNum / 8)
        const view = new DataView(buffer)
        if (bit === '32') view.setInt32(0, value as number, false)
        else view.setBigInt64(0, num, false)
        return new Uint8Array(buffer)
    }

    public int32(value: number) {
        return this.int('32', value)
    }

    public int64(value: bigint | number) {
        return this.int('64', value)
    }

    public bytes(value: Uint8Array) {
        const length = this.int32(value.length)
        return this.concatBytes(length, value)
    }

    public string(value: string) {
        const utf8Bytes = new TextEncoder().encode(value)
        return this.bytes(utf8Bytes)
    }

    public fromHexString(value: string) {
        if (!isHexString(value))
            this.ctx.error.throw({
                message: `Provided value is not a hex string: ${value}`,
                type: 'Unexpected',
            })

        const bytes = new Uint8Array(value.length / 2)
        for (let i = 0; i < value.length; i += 2) {
            bytes[i / 2] = parseInt(value.slice(i, i + 2), 16)
        }
        return this.bytes(bytes)
    }
}
