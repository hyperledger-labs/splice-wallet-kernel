import { UnknownFieldHandler } from '@protobuf-ts/runtime'
import { reflectionMergePartial } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
// @generated message type with reflection information, may provide speed optimized methods
class Empty$Type extends MessageType {
    constructor() {
        super('google.protobuf.Empty', [])
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
 * @generated MessageType for protobuf message google.protobuf.Empty
 */
export const Empty = new Empty$Type()
