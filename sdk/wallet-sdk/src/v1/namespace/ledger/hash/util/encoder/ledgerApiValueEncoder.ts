// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { Encoder } from './encoder.js'
import { PrimitiveEncoder } from './primitiveEncoder.js'
import { WalletSdkContext } from 'src/v1/sdk.js'
import { Optional } from '@canton-network/core-token-standard'
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
    Record,
    TextMap,
    Variant,
} from '@canton-network/core-ledger-proto/dist/types/_proto/com/daml/ledger/api/v2/value.js'

export class LedgerApiValueEncoder extends Encoder {
    private encodePrimitive: PrimitiveEncoder
    private encodeCollection: CollectionEncoder
    constructor(protected ctx: WalletSdkContext) {
        super(ctx)
        this.encodePrimitive = new PrimitiveEncoder(ctx)
        this.encodeCollection = new CollectionEncoder(ctx)
    }

    private unit() {
        return this.emptyByte()
    }

    private bool(value: boolean) {
        return this.concatBytes(0x01, this.encodePrimitive.bool(value))
    }

    private int64(value: number) {
        return this.concatBytes(0x02, this.encodePrimitive.int64(value))
    }

    private numeric(value: string) {
        return this.concatBytes(0x03, this.encodePrimitive.string(value))
    }

    private timestamp(value: number) {
        return this.concatBytes(0x04, this.encodePrimitive.int64(value))
    }

    private date(value: number) {
        return this.concatBytes(0x05, this.encodePrimitive.int32(value))
    }

    private party(value: PartyId) {
        return this.concatBytes(0x06, this.encodePrimitive.string(value))
    }

    private text(value: string) {
        return this.concatBytes(0x07, this.encodePrimitive.string(value))
    }

    /**
     * @param value - It should be of type {@link HexString}
     */
    private contractId(value: string) {
        return this.concatBytes(
            0x08,
            ...this.encodePrimitive.fromHexString(value)
        )
    }

    private optional(value: Optional<{ value: Value }>) {
        return this.concatBytes(
            0x09,
            ...this.encodeCollection.optional(value?.value, this.value)
        )
    }

    private list(value: List) {
        return this.concatBytes(
            0x0a,
            this.encodeCollection.repeated(value.elements, this.value)
        )
    }

    private textMapEntry(value: TextMap_Entry) {
        return this.concatBytes(
            this.encodePrimitive.string(value.key),
            this.value(value.value)
        )
    }

    private textMap(value: TextMap) {
        return this.concatBytes(
            0x0b,
            this.encodeCollection.repeated(value.entries, this.textMapEntry)
        )
    }

    private record(value: Record) {
        return this.concatBytes(
            0x0c,
            this.encodeCollection.optional(value.recordId, this.identifier),
            this.encodeCollection.repeated(value.fields, this.recordField)
        )
    }

    private recordField(value: RecordField) {
        return this.concatBytes(
            this.encodePrimitive.string(value.label),
            this.value(value.value)
        )
    }

    private variant(value: Variant) {
        return this.concatBytes(
            0x0d,
            this.encodeCollection.optional(value.variantId, this.identifier),
            this.encodePrimitive.string(value.constructor),
            this.value(value.value)
        )
    }

    private enum(value: Enum) {
        return this.concatBytes(
            0x0e,
            this.encodeCollection.optional(value.enumId, this.identifier),
            this.encodePrimitive.string(value.constructor)
        )
    }

    private genMapEntry(value: GenMap_Entry) {
        return this.concatBytes(this.value(value.key), this.value(value.value))
    }

    private genMap(value: GenMap) {
        return this.concatBytes(
            0x0f,
            this.encodeCollection.repeated(value.entries, this.genMapEntry)
        )
    }

    private identifier(value: Identifier) {
        const encodedPackageId = this.encodePrimitive.string(value.packageId)
        const encodedModuleName = this.encodeCollection.repeated(
            value.moduleName.split('.'),
            this.encodePrimitive.string
        )
        const encodedEntityName = this.encodeCollection.repeated(
            value.entityName.split('.'),
            this.encodePrimitive.string
        )
        return this.concatBytes(
            encodedPackageId,
            encodedModuleName,
            encodedEntityName
        )
    }

    public value(value: Value | undefined) {
        console.log(value)
        return new Uint8Array(0)
    }
}
