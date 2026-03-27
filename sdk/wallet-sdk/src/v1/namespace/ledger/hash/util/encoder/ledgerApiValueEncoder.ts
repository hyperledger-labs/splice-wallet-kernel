// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { Encoder } from './encoder.js'
import { PrimitiveEncoder } from './primitiveEncoder.js'
import { WalletSdkContext } from 'src/v1/sdk.js'
import {
    RecordField,
    TextMap_Entry,
    Value,
} from '@canton-network/core-ledger-proto'
import { CollectionEncoder } from './collectionEncoder.js'
import {
    Enum,
    GenMap,
    GenMap_Entry,
    Identifier,
    List,
    Optional,
    Record,
    TextMap,
    Variant,
} from '@canton-network/core-ledger-proto/dist/types/_proto/com/daml/ledger/api/v2/value.js'

export class LedgerApiValueEncoder extends Encoder {
    private readonly encodePrimitive: PrimitiveEncoder
    private readonly encodeCollection: CollectionEncoder
    constructor(protected ctx: WalletSdkContext) {
        super(ctx)
        this.encodePrimitive = new PrimitiveEncoder(ctx)
        this.encodeCollection = new CollectionEncoder(ctx)
    }

    private readonly unit = (): Uint8Array => {
        return this.emptyByte
    }

    private readonly bool = (value: boolean): Uint8Array => {
        return this.concatBytes(0x01, this.encodePrimitive.bool(value))
    }

    private readonly int64 = (value: number): Uint8Array => {
        return this.concatBytes(0x02, this.encodePrimitive.int64(value))
    }

    private readonly numeric = (value: string): Uint8Array => {
        return this.concatBytes(0x03, this.encodePrimitive.string(value))
    }

    private readonly timestamp = (value: string): Uint8Array => {
        return this.concatBytes(0x04, this.encodePrimitive.string(value))
    }

    private readonly date = (value: number): Uint8Array => {
        return this.concatBytes(0x05, this.encodePrimitive.int32(value))
    }

    private readonly party = (value: PartyId): Uint8Array => {
        return this.concatBytes(0x06, this.encodePrimitive.string(value))
    }

    private readonly text = (value: string): Uint8Array => {
        return this.concatBytes(0x07, this.encodePrimitive.string(value))
    }

    /**
     * @param value - It should be of type {@link HexString}
     */
    public readonly contractId = (value: string): Uint8Array => {
        return this.concatBytes(0x08, ...this.encodePrimitive.hexString(value))
    }

    private readonly optional = (value: Optional): Uint8Array => {
        return this.concatBytes(
            0x09,
            this.encodeCollection.optionalSync(value?.value, this.value)
        )
    }

    private readonly list = (value: List): Uint8Array => {
        return this.concatBytes(
            0x0a,
            this.encodeCollection.repeatedSync(value.elements, this.value)
        )
    }

    private readonly textMapEntry = (value: TextMap_Entry): Uint8Array => {
        return this.concatBytes(
            this.encodePrimitive.string(value.key),
            this.value(value.value)
        )
    }

    private readonly textMap = (value: TextMap): Uint8Array => {
        return this.concatBytes(
            0x0b,
            this.encodeCollection.repeatedSync(value.entries, this.textMapEntry)
        )
    }

    private readonly record = (value: Record): Uint8Array => {
        return this.concatBytes(
            0x0c,
            this.encodeCollection.optionalSync(value.recordId, this.identifier),
            this.encodeCollection.repeatedSync(value.fields, this.recordField)
        )
    }

    private readonly recordField = (value: RecordField): Uint8Array => {
        return this.concatBytes(
            this.encodePrimitive.string(value.label),
            this.value(value.value)
        )
    }

    private readonly variant = (value: Variant): Uint8Array => {
        return this.concatBytes(
            0x0d,
            this.encodeCollection.optionalSync(
                value.variantId,
                this.identifier
            ),
            this.encodePrimitive.string(value.constructor),
            this.value(value.value)
        )
    }

    private readonly enum = (value: Enum): Uint8Array => {
        return this.concatBytes(
            0x0e,
            this.encodeCollection.optionalSync(value.enumId, this.identifier),
            this.encodePrimitive.string(value.constructor)
        )
    }

    private readonly genMapEntry = (value: GenMap_Entry): Uint8Array => {
        return this.concatBytes(this.value(value.key), this.value(value.value))
    }

    private readonly genMap = (value: GenMap): Uint8Array => {
        return this.concatBytes(
            0x0f,
            this.encodeCollection.repeatedSync(value.entries, this.genMapEntry)
        )
    }

    public readonly identifier = (value: Identifier): Uint8Array => {
        const encodedPackageId = this.encodePrimitive.string(value.packageId)
        const encodedModuleName = this.encodeCollection.repeatedSync(
            value.moduleName.split('.'),
            this.encodePrimitive.string
        )
        const encodedEntityName = this.encodeCollection.repeatedSync(
            value.entityName.split('.'),
            this.encodePrimitive.string
        )
        return this.concatBytes(
            encodedPackageId,
            encodedModuleName,
            encodedEntityName
        )
    }

    public readonly value = (value: Value | undefined): Uint8Array => {
        if (!value || value.sum.oneofKind === undefined) return this.emptyByte

        const { oneofKind, ...rest } = value.sum

        if (!(oneofKind in rest))
            this.ctx.error.throw({
                message: 'Wrong data structure input',
                type: 'CantonError',
            })

        const argValue = rest[oneofKind as keyof typeof rest]
        const method = this[oneofKind]

        return method(argValue)
    }
}
