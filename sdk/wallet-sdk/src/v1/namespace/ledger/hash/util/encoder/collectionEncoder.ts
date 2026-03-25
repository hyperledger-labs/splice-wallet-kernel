// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from 'src/v1/sdk'
import { Encoder } from './encoder'
import { PrimitiveEncoder } from './primitiveEncoder'

export class CollectionEncoder extends Encoder {
    private encodePrimitive: PrimitiveEncoder
    constructor(protected readonly ctx: WalletSdkContext) {
        super(ctx)
        this.encodePrimitive = new PrimitiveEncoder(ctx)
    }

    public repeated<T>(
        values: T[],
        encodeFn: (value: T) => Uint8Array
    ): Uint8Array {
        const length = this.encodePrimitive.int32(values.length)
        const encodedValues = values.map(encodeFn)
        return this.concatBytes(length, ...encodedValues)
    }

    public optional<T>(
        value: T | undefined | null,
        encodeFn: (arg: T) => Uint8Array
    ): Uint8Array {
        if (value === undefined || value === null) {
            return this.emptyByte()
        } else {
            return this.concatBytes(this.existingByte(), encodeFn(value))
        }
    }
}
