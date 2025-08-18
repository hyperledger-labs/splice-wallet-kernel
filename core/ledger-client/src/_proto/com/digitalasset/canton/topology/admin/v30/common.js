import { WireType } from '@protobuf-ts/runtime'
import { UnknownFieldHandler } from '@protobuf-ts/runtime'
import { reflectionMergePartial } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { Timestamp } from '../../../../../../google/protobuf/timestamp.js'
// @generated message type with reflection information, may provide speed optimized methods
class TopologyTransactions$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.topology.admin.v30.TopologyTransactions',
            [
                {
                    no: 1,
                    name: 'items',
                    kind: 'message',
                    repeat: 2 /*RepeatType.UNPACKED*/,
                    T: () => TopologyTransactions_Item,
                },
            ]
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.items = []
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* repeated com.digitalasset.canton.topology.admin.v30.TopologyTransactions.Item items */ 1:
                    message.items.push(
                        TopologyTransactions_Item.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options
                        )
                    )
                    break
                default:
                    let u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    let d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* repeated com.digitalasset.canton.topology.admin.v30.TopologyTransactions.Item items = 1; */
        for (let i = 0; i < message.items.length; i++)
            TopologyTransactions_Item.internalBinaryWrite(
                message.items[i],
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        let u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.TopologyTransactions
 */
export const TopologyTransactions = new TopologyTransactions$Type()
// @generated message type with reflection information, may provide speed optimized methods
class TopologyTransactions_Item$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.topology.admin.v30.TopologyTransactions.Item',
            [
                {
                    no: 4,
                    name: 'sequenced',
                    kind: 'message',
                    T: () => Timestamp,
                },
                {
                    no: 1,
                    name: 'valid_from',
                    kind: 'message',
                    T: () => Timestamp,
                },
                {
                    no: 2,
                    name: 'valid_until',
                    kind: 'message',
                    T: () => Timestamp,
                },
                {
                    no: 3,
                    name: 'transaction',
                    kind: 'scalar',
                    T: 12 /*ScalarType.BYTES*/,
                },
                {
                    no: 5,
                    name: 'rejection_reason',
                    kind: 'scalar',
                    opt: true,
                    T: 9 /*ScalarType.STRING*/,
                },
            ]
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.transaction = new Uint8Array(0)
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* google.protobuf.Timestamp sequenced */ 4:
                    message.sequenced = Timestamp.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.sequenced
                    )
                    break
                case /* google.protobuf.Timestamp valid_from */ 1:
                    message.validFrom = Timestamp.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.validFrom
                    )
                    break
                case /* google.protobuf.Timestamp valid_until */ 2:
                    message.validUntil = Timestamp.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.validUntil
                    )
                    break
                case /* bytes transaction */ 3:
                    message.transaction = reader.bytes()
                    break
                case /* optional string rejection_reason */ 5:
                    message.rejectionReason = reader.string()
                    break
                default:
                    let u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    let d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* google.protobuf.Timestamp valid_from = 1; */
        if (message.validFrom)
            Timestamp.internalBinaryWrite(
                message.validFrom,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Timestamp valid_until = 2; */
        if (message.validUntil)
            Timestamp.internalBinaryWrite(
                message.validUntil,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* bytes transaction = 3; */
        if (message.transaction.length)
            writer.tag(3, WireType.LengthDelimited).bytes(message.transaction)
        /* google.protobuf.Timestamp sequenced = 4; */
        if (message.sequenced)
            Timestamp.internalBinaryWrite(
                message.sequenced,
                writer.tag(4, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* optional string rejection_reason = 5; */
        if (message.rejectionReason !== undefined)
            writer
                .tag(5, WireType.LengthDelimited)
                .string(message.rejectionReason)
        let u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.TopologyTransactions.Item
 */
export const TopologyTransactions_Item = new TopologyTransactions_Item$Type()
// @generated message type with reflection information, may provide speed optimized methods
class StoreId$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.topology.admin.v30.StoreId', [
            {
                no: 1,
                name: 'authorized',
                kind: 'message',
                oneof: 'store',
                T: () => StoreId_Authorized,
            },
            {
                no: 2,
                name: 'synchronizer',
                kind: 'message',
                oneof: 'store',
                T: () => StoreId_Synchronizer,
            },
            {
                no: 3,
                name: 'temporary',
                kind: 'message',
                oneof: 'store',
                T: () => StoreId_Temporary,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.store = { oneofKind: undefined }
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* com.digitalasset.canton.topology.admin.v30.StoreId.Authorized authorized */ 1:
                    message.store = {
                        oneofKind: 'authorized',
                        authorized: StoreId_Authorized.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.store.authorized
                        ),
                    }
                    break
                case /* com.digitalasset.canton.topology.admin.v30.StoreId.Synchronizer synchronizer */ 2:
                    message.store = {
                        oneofKind: 'synchronizer',
                        synchronizer: StoreId_Synchronizer.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.store.synchronizer
                        ),
                    }
                    break
                case /* com.digitalasset.canton.topology.admin.v30.StoreId.Temporary temporary */ 3:
                    message.store = {
                        oneofKind: 'temporary',
                        temporary: StoreId_Temporary.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.store.temporary
                        ),
                    }
                    break
                default:
                    let u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    let d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* com.digitalasset.canton.topology.admin.v30.StoreId.Authorized authorized = 1; */
        if (message.store.oneofKind === 'authorized')
            StoreId_Authorized.internalBinaryWrite(
                message.store.authorized,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.topology.admin.v30.StoreId.Synchronizer synchronizer = 2; */
        if (message.store.oneofKind === 'synchronizer')
            StoreId_Synchronizer.internalBinaryWrite(
                message.store.synchronizer,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.topology.admin.v30.StoreId.Temporary temporary = 3; */
        if (message.store.oneofKind === 'temporary')
            StoreId_Temporary.internalBinaryWrite(
                message.store.temporary,
                writer.tag(3, WireType.LengthDelimited).fork(),
                options
            ).join()
        let u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.StoreId
 */
export const StoreId = new StoreId$Type()
// @generated message type with reflection information, may provide speed optimized methods
class StoreId_Authorized$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.topology.admin.v30.StoreId.Authorized',
            []
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                default:
                    let u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    let d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        let u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.StoreId.Authorized
 */
export const StoreId_Authorized = new StoreId_Authorized$Type()
// @generated message type with reflection information, may provide speed optimized methods
class StoreId_Synchronizer$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.topology.admin.v30.StoreId.Synchronizer',
            [
                {
                    no: 1,
                    name: 'id',
                    kind: 'scalar',
                    oneof: 'kind',
                    T: 9 /*ScalarType.STRING*/,
                },
                {
                    no: 2,
                    name: 'physical_id',
                    kind: 'scalar',
                    oneof: 'kind',
                    T: 9 /*ScalarType.STRING*/,
                },
            ]
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.kind = { oneofKind: undefined }
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* string id */ 1:
                    message.kind = {
                        oneofKind: 'id',
                        id: reader.string(),
                    }
                    break
                case /* string physical_id */ 2:
                    message.kind = {
                        oneofKind: 'physicalId',
                        physicalId: reader.string(),
                    }
                    break
                default:
                    let u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    let d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* string id = 1; */
        if (message.kind.oneofKind === 'id')
            writer.tag(1, WireType.LengthDelimited).string(message.kind.id)
        /* string physical_id = 2; */
        if (message.kind.oneofKind === 'physicalId')
            writer
                .tag(2, WireType.LengthDelimited)
                .string(message.kind.physicalId)
        let u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.StoreId.Synchronizer
 */
export const StoreId_Synchronizer = new StoreId_Synchronizer$Type()
// @generated message type with reflection information, may provide speed optimized methods
class StoreId_Temporary$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.topology.admin.v30.StoreId.Temporary', [
            { no: 1, name: 'name', kind: 'scalar', T: 9 /*ScalarType.STRING*/ },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.name = ''
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* string name */ 1:
                    message.name = reader.string()
                    break
                default:
                    let u = options.readUnknownField
                    if (u === 'throw')
                        throw new globalThis.Error(
                            `Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`
                        )
                    let d = reader.skip(wireType)
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(
                            this.typeName,
                            message,
                            fieldNo,
                            wireType,
                            d
                        )
            }
        }
        return message
    }
    internalBinaryWrite(message, writer, options) {
        /* string name = 1; */
        if (message.name !== '')
            writer.tag(1, WireType.LengthDelimited).string(message.name)
        let u = options.writeUnknownFields
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(
                this.typeName,
                message,
                writer
            )
        return writer
    }
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.StoreId.Temporary
 */
export const StoreId_Temporary = new StoreId_Temporary$Type()
