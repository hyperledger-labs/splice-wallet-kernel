import { WireType } from '@protobuf-ts/runtime'
import { UnknownFieldHandler } from '@protobuf-ts/runtime'
import { reflectionMergePartial } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { Duration } from '../../../../../google/protobuf/duration.js'
// @generated message type with reflection information, may provide speed optimized methods
class TrafficControlParameters$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.TrafficControlParameters',
            [
                {
                    no: 1,
                    name: 'max_base_traffic_amount',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 3,
                    name: 'max_base_traffic_accumulation_duration',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 4,
                    name: 'read_vs_write_scaling_factor',
                    kind: 'scalar',
                    T: 13 /*ScalarType.UINT32*/,
                },
                {
                    no: 5,
                    name: 'set_balance_request_submission_window_size',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 6,
                    name: 'enforce_rate_limiting',
                    kind: 'scalar',
                    T: 8 /*ScalarType.BOOL*/,
                },
                {
                    no: 7,
                    name: 'base_event_cost',
                    kind: 'scalar',
                    opt: true,
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
            ],
            {
                'scalapb.message': {
                    companionExtends: [
                        'com.digitalasset.canton.version.AlphaProtoVersion',
                    ],
                },
            }
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.maxBaseTrafficAmount = 0n
        message.readVsWriteScalingFactor = 0
        message.enforceRateLimiting = false
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* uint64 max_base_traffic_amount */ 1:
                    message.maxBaseTrafficAmount = reader.uint64().toBigInt()
                    break
                case /* google.protobuf.Duration max_base_traffic_accumulation_duration */ 3:
                    message.maxBaseTrafficAccumulationDuration =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.maxBaseTrafficAccumulationDuration
                        )
                    break
                case /* uint32 read_vs_write_scaling_factor */ 4:
                    message.readVsWriteScalingFactor = reader.uint32()
                    break
                case /* google.protobuf.Duration set_balance_request_submission_window_size */ 5:
                    message.setBalanceRequestSubmissionWindowSize =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.setBalanceRequestSubmissionWindowSize
                        )
                    break
                case /* bool enforce_rate_limiting */ 6:
                    message.enforceRateLimiting = reader.bool()
                    break
                case /* optional uint64 base_event_cost */ 7:
                    message.baseEventCost = reader.uint64().toBigInt()
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
        /* uint64 max_base_traffic_amount = 1; */
        if (message.maxBaseTrafficAmount !== 0n)
            writer.tag(1, WireType.Varint).uint64(message.maxBaseTrafficAmount)
        /* google.protobuf.Duration max_base_traffic_accumulation_duration = 3; */
        if (message.maxBaseTrafficAccumulationDuration)
            Duration.internalBinaryWrite(
                message.maxBaseTrafficAccumulationDuration,
                writer.tag(3, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* uint32 read_vs_write_scaling_factor = 4; */
        if (message.readVsWriteScalingFactor !== 0)
            writer
                .tag(4, WireType.Varint)
                .uint32(message.readVsWriteScalingFactor)
        /* google.protobuf.Duration set_balance_request_submission_window_size = 5; */
        if (message.setBalanceRequestSubmissionWindowSize)
            Duration.internalBinaryWrite(
                message.setBalanceRequestSubmissionWindowSize,
                writer.tag(5, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* bool enforce_rate_limiting = 6; */
        if (message.enforceRateLimiting !== false)
            writer.tag(6, WireType.Varint).bool(message.enforceRateLimiting)
        /* optional uint64 base_event_cost = 7; */
        if (message.baseEventCost !== undefined)
            writer.tag(7, WireType.Varint).uint64(message.baseEventCost)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficControlParameters
 */
export const TrafficControlParameters = new TrafficControlParameters$Type()
// @generated message type with reflection information, may provide speed optimized methods
class TrafficReceipt$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.TrafficReceipt',
            [
                {
                    no: 1,
                    name: 'consumed_cost',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 2,
                    name: 'extra_traffic_consumed',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 3,
                    name: 'base_traffic_remainder',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
            ],
            {
                'scalapb.message': {
                    companionExtends: [
                        'com.digitalasset.canton.version.AlphaProtoVersion',
                    ],
                },
            }
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.consumedCost = 0n
        message.extraTrafficConsumed = 0n
        message.baseTrafficRemainder = 0n
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* uint64 consumed_cost */ 1:
                    message.consumedCost = reader.uint64().toBigInt()
                    break
                case /* uint64 extra_traffic_consumed */ 2:
                    message.extraTrafficConsumed = reader.uint64().toBigInt()
                    break
                case /* uint64 base_traffic_remainder */ 3:
                    message.baseTrafficRemainder = reader.uint64().toBigInt()
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
        /* uint64 consumed_cost = 1; */
        if (message.consumedCost !== 0n)
            writer.tag(1, WireType.Varint).uint64(message.consumedCost)
        /* uint64 extra_traffic_consumed = 2; */
        if (message.extraTrafficConsumed !== 0n)
            writer.tag(2, WireType.Varint).uint64(message.extraTrafficConsumed)
        /* uint64 base_traffic_remainder = 3; */
        if (message.baseTrafficRemainder !== 0n)
            writer.tag(3, WireType.Varint).uint64(message.baseTrafficRemainder)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficReceipt
 */
export const TrafficReceipt = new TrafficReceipt$Type()
// @generated message type with reflection information, may provide speed optimized methods
class TrafficConsumed$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.TrafficConsumed',
            [
                {
                    no: 1,
                    name: 'member',
                    kind: 'scalar',
                    T: 9 /*ScalarType.STRING*/,
                },
                {
                    no: 2,
                    name: 'extra_traffic_consumed',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 3,
                    name: 'base_traffic_remainder',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 4,
                    name: 'last_consumed_cost',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 5,
                    name: 'sequencing_timestamp',
                    kind: 'scalar',
                    T: 3 /*ScalarType.INT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
            ],
            {
                'scalapb.message': {
                    companionExtends: [
                        'com.digitalasset.canton.version.AlphaProtoVersion',
                    ],
                },
            }
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.member = ''
        message.extraTrafficConsumed = 0n
        message.baseTrafficRemainder = 0n
        message.lastConsumedCost = 0n
        message.sequencingTimestamp = 0n
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* string member */ 1:
                    message.member = reader.string()
                    break
                case /* uint64 extra_traffic_consumed */ 2:
                    message.extraTrafficConsumed = reader.uint64().toBigInt()
                    break
                case /* uint64 base_traffic_remainder */ 3:
                    message.baseTrafficRemainder = reader.uint64().toBigInt()
                    break
                case /* uint64 last_consumed_cost */ 4:
                    message.lastConsumedCost = reader.uint64().toBigInt()
                    break
                case /* int64 sequencing_timestamp */ 5:
                    message.sequencingTimestamp = reader.int64().toBigInt()
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
        /* string member = 1; */
        if (message.member !== '')
            writer.tag(1, WireType.LengthDelimited).string(message.member)
        /* uint64 extra_traffic_consumed = 2; */
        if (message.extraTrafficConsumed !== 0n)
            writer.tag(2, WireType.Varint).uint64(message.extraTrafficConsumed)
        /* uint64 base_traffic_remainder = 3; */
        if (message.baseTrafficRemainder !== 0n)
            writer.tag(3, WireType.Varint).uint64(message.baseTrafficRemainder)
        /* uint64 last_consumed_cost = 4; */
        if (message.lastConsumedCost !== 0n)
            writer.tag(4, WireType.Varint).uint64(message.lastConsumedCost)
        /* int64 sequencing_timestamp = 5; */
        if (message.sequencingTimestamp !== 0n)
            writer.tag(5, WireType.Varint).int64(message.sequencingTimestamp)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficConsumed
 */
export const TrafficConsumed = new TrafficConsumed$Type()
// @generated message type with reflection information, may provide speed optimized methods
class TrafficPurchased$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.TrafficPurchased',
            [
                {
                    no: 1,
                    name: 'member',
                    kind: 'scalar',
                    T: 9 /*ScalarType.STRING*/,
                },
                {
                    no: 2,
                    name: 'serial',
                    kind: 'scalar',
                    T: 13 /*ScalarType.UINT32*/,
                },
                {
                    no: 3,
                    name: 'extra_traffic_purchased',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 4,
                    name: 'sequencing_timestamp',
                    kind: 'scalar',
                    T: 3 /*ScalarType.INT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
            ],
            {
                'scalapb.message': {
                    companionExtends: [
                        'com.digitalasset.canton.version.AlphaProtoVersion',
                    ],
                },
            }
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.member = ''
        message.serial = 0
        message.extraTrafficPurchased = 0n
        message.sequencingTimestamp = 0n
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* string member */ 1:
                    message.member = reader.string()
                    break
                case /* uint32 serial */ 2:
                    message.serial = reader.uint32()
                    break
                case /* uint64 extra_traffic_purchased */ 3:
                    message.extraTrafficPurchased = reader.uint64().toBigInt()
                    break
                case /* int64 sequencing_timestamp */ 4:
                    message.sequencingTimestamp = reader.int64().toBigInt()
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
        /* string member = 1; */
        if (message.member !== '')
            writer.tag(1, WireType.LengthDelimited).string(message.member)
        /* uint32 serial = 2; */
        if (message.serial !== 0)
            writer.tag(2, WireType.Varint).uint32(message.serial)
        /* uint64 extra_traffic_purchased = 3; */
        if (message.extraTrafficPurchased !== 0n)
            writer.tag(3, WireType.Varint).uint64(message.extraTrafficPurchased)
        /* int64 sequencing_timestamp = 4; */
        if (message.sequencingTimestamp !== 0n)
            writer.tag(4, WireType.Varint).int64(message.sequencingTimestamp)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficPurchased
 */
export const TrafficPurchased = new TrafficPurchased$Type()
// @generated message type with reflection information, may provide speed optimized methods
class TrafficState$Type extends MessageType {
    constructor() {
        super('com.digitalasset.canton.protocol.v30.TrafficState', [
            {
                no: 1,
                name: 'extra_traffic_purchased',
                kind: 'scalar',
                T: 3 /*ScalarType.INT64*/,
                L: 0 /*LongType.BIGINT*/,
            },
            {
                no: 2,
                name: 'extra_traffic_consumed',
                kind: 'scalar',
                T: 3 /*ScalarType.INT64*/,
                L: 0 /*LongType.BIGINT*/,
            },
            {
                no: 3,
                name: 'base_traffic_remainder',
                kind: 'scalar',
                T: 3 /*ScalarType.INT64*/,
                L: 0 /*LongType.BIGINT*/,
            },
            {
                no: 4,
                name: 'last_consumed_cost',
                kind: 'scalar',
                T: 4 /*ScalarType.UINT64*/,
                L: 0 /*LongType.BIGINT*/,
            },
            {
                no: 5,
                name: 'timestamp',
                kind: 'scalar',
                T: 3 /*ScalarType.INT64*/,
                L: 0 /*LongType.BIGINT*/,
            },
            {
                no: 6,
                name: 'serial',
                kind: 'scalar',
                opt: true,
                T: 13 /*ScalarType.UINT32*/,
            },
        ])
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.extraTrafficPurchased = 0n
        message.extraTrafficConsumed = 0n
        message.baseTrafficRemainder = 0n
        message.lastConsumedCost = 0n
        message.timestamp = 0n
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* int64 extra_traffic_purchased */ 1:
                    message.extraTrafficPurchased = reader.int64().toBigInt()
                    break
                case /* int64 extra_traffic_consumed */ 2:
                    message.extraTrafficConsumed = reader.int64().toBigInt()
                    break
                case /* int64 base_traffic_remainder */ 3:
                    message.baseTrafficRemainder = reader.int64().toBigInt()
                    break
                case /* uint64 last_consumed_cost */ 4:
                    message.lastConsumedCost = reader.uint64().toBigInt()
                    break
                case /* int64 timestamp */ 5:
                    message.timestamp = reader.int64().toBigInt()
                    break
                case /* optional uint32 serial */ 6:
                    message.serial = reader.uint32()
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
        /* int64 extra_traffic_purchased = 1; */
        if (message.extraTrafficPurchased !== 0n)
            writer.tag(1, WireType.Varint).int64(message.extraTrafficPurchased)
        /* int64 extra_traffic_consumed = 2; */
        if (message.extraTrafficConsumed !== 0n)
            writer.tag(2, WireType.Varint).int64(message.extraTrafficConsumed)
        /* int64 base_traffic_remainder = 3; */
        if (message.baseTrafficRemainder !== 0n)
            writer.tag(3, WireType.Varint).int64(message.baseTrafficRemainder)
        /* uint64 last_consumed_cost = 4; */
        if (message.lastConsumedCost !== 0n)
            writer.tag(4, WireType.Varint).uint64(message.lastConsumedCost)
        /* int64 timestamp = 5; */
        if (message.timestamp !== 0n)
            writer.tag(5, WireType.Varint).int64(message.timestamp)
        /* optional uint32 serial = 6; */
        if (message.serial !== undefined)
            writer.tag(6, WireType.Varint).uint32(message.serial)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficState
 */
export const TrafficState = new TrafficState$Type()
// @generated message type with reflection information, may provide speed optimized methods
class SetTrafficPurchasedMessage$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.SetTrafficPurchasedMessage',
            [
                {
                    no: 1,
                    name: 'member',
                    kind: 'scalar',
                    T: 9 /*ScalarType.STRING*/,
                },
                {
                    no: 2,
                    name: 'serial',
                    kind: 'scalar',
                    T: 13 /*ScalarType.UINT32*/,
                },
                {
                    no: 4,
                    name: 'total_traffic_purchased',
                    kind: 'scalar',
                    T: 4 /*ScalarType.UINT64*/,
                    L: 0 /*LongType.BIGINT*/,
                },
                {
                    no: 5,
                    name: 'physical_synchronizer_id',
                    kind: 'scalar',
                    T: 9 /*ScalarType.STRING*/,
                },
            ],
            {
                'scalapb.message': {
                    companionExtends: [
                        'com.digitalasset.canton.version.AlphaProtoVersion',
                    ],
                },
            }
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.member = ''
        message.serial = 0
        message.totalTrafficPurchased = 0n
        message.physicalSynchronizerId = ''
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* string member */ 1:
                    message.member = reader.string()
                    break
                case /* uint32 serial */ 2:
                    message.serial = reader.uint32()
                    break
                case /* uint64 total_traffic_purchased */ 4:
                    message.totalTrafficPurchased = reader.uint64().toBigInt()
                    break
                case /* string physical_synchronizer_id */ 5:
                    message.physicalSynchronizerId = reader.string()
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
        /* string member = 1; */
        if (message.member !== '')
            writer.tag(1, WireType.LengthDelimited).string(message.member)
        /* uint32 serial = 2; */
        if (message.serial !== 0)
            writer.tag(2, WireType.Varint).uint32(message.serial)
        /* uint64 total_traffic_purchased = 4; */
        if (message.totalTrafficPurchased !== 0n)
            writer.tag(4, WireType.Varint).uint64(message.totalTrafficPurchased)
        /* string physical_synchronizer_id = 5; */
        if (message.physicalSynchronizerId !== '')
            writer
                .tag(5, WireType.LengthDelimited)
                .string(message.physicalSynchronizerId)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SetTrafficPurchasedMessage
 */
export const SetTrafficPurchasedMessage = new SetTrafficPurchasedMessage$Type()
