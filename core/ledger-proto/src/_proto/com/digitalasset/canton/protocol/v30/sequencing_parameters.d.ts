import type { BinaryWriteOptions } from '@protobuf-ts/runtime'
import type { IBinaryWriter } from '@protobuf-ts/runtime'
import type { BinaryReadOptions } from '@protobuf-ts/runtime'
import type { IBinaryReader } from '@protobuf-ts/runtime'
import type { PartialMessage } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.DynamicSequencingParameters
 */
export interface DynamicSequencingParameters {
    /**
     * Sequencing dynamic synchronizer parameters can only be interpreted by a sequencer implementation
     *  and are opaque to the rest of the synchronizer.
     *
     * @generated from protobuf field: bytes payload = 1
     */
    payload: Uint8Array
}
declare class DynamicSequencingParameters$Type extends MessageType<DynamicSequencingParameters> {
    constructor()
    create(
        value?: PartialMessage<DynamicSequencingParameters>
    ): DynamicSequencingParameters
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: DynamicSequencingParameters
    ): DynamicSequencingParameters
    internalBinaryWrite(
        message: DynamicSequencingParameters,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.DynamicSequencingParameters
 */
export declare const DynamicSequencingParameters: DynamicSequencingParameters$Type
export {}
//# sourceMappingURL=sequencing_parameters.d.ts.map
