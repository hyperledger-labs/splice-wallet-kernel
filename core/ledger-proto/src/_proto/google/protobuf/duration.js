import { WireType } from '@protobuf-ts/runtime'
import { UnknownFieldHandler } from '@protobuf-ts/runtime'
import { reflectionMergePartial } from '@protobuf-ts/runtime'
import { typeofJsonValue } from '@protobuf-ts/runtime'
import { PbLong } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
// @generated message type with reflection information, may provide speed optimized methods
class Duration$Type extends MessageType {
    constructor() {
        super('google.protobuf.Duration', [
            {
                no: 1,
                name: 'seconds',
                kind: 'scalar',
                T: 3 /*ScalarType.INT64*/,
                L: 0 /*LongType.BIGINT*/,
            },
            { no: 2, name: 'nanos', kind: 'scalar', T: 5 /*ScalarType.INT32*/ },
        ])
    }
    /**
     * Encode `Duration` to JSON string like "3.000001s".
     */
    internalJsonWrite(message, options) {
        let s = PbLong.from(message.seconds).toNumber()
        if (s > 315576000000 || s < -315576000000)
            throw new Error('Duration value out of range.')
        let text = message.seconds.toString()
        if (s === 0 && message.nanos < 0) text = '-' + text
        if (message.nanos !== 0) {
            let nanosStr = Math.abs(message.nanos).toString()
            nanosStr = '0'.repeat(9 - nanosStr.length) + nanosStr
            if (nanosStr.substring(3) === '000000')
                nanosStr = nanosStr.substring(0, 3)
            else if (nanosStr.substring(6) === '000')
                nanosStr = nanosStr.substring(0, 6)
            text += '.' + nanosStr
        }
        return text + 's'
    }
    /**
     * Decode `Duration` from JSON string like "3.000001s"
     */
    internalJsonRead(json, options, target) {
        if (typeof json !== 'string')
            throw new Error(
                'Unable to parse Duration from JSON ' +
                    typeofJsonValue(json) +
                    '. Expected string.'
            )
        let match = json.match(/^(-?)([0-9]+)(?:\.([0-9]+))?s/)
        if (match === null)
            throw new Error(
                'Unable to parse Duration from JSON string. Invalid format.'
            )
        if (!target) target = this.create()
        let [, sign, secs, nanos] = match
        let longSeconds = PbLong.from(sign + secs)
        if (
            longSeconds.toNumber() > 315576000000 ||
            longSeconds.toNumber() < -315576000000
        )
            throw new Error(
                'Unable to parse Duration from JSON string. Value out of range.'
            )
        target.seconds = longSeconds.toBigInt()
        if (typeof nanos == 'string') {
            let nanosStr = sign + nanos + '0'.repeat(9 - nanos.length)
            target.nanos = parseInt(nanosStr)
        }
        return target
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.seconds = 0n
        message.nanos = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* int64 seconds */ 1:
                    message.seconds = reader.int64().toBigInt()
                    break
                case /* int32 nanos */ 2:
                    message.nanos = reader.int32()
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
        /* int64 seconds = 1; */
        if (message.seconds !== 0n)
            writer.tag(1, WireType.Varint).int64(message.seconds)
        /* int32 nanos = 2; */
        if (message.nanos !== 0)
            writer.tag(2, WireType.Varint).int32(message.nanos)
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
 * @generated MessageType for protobuf message google.protobuf.Duration
 */
export const Duration = new Duration$Type()
