import type { BinaryWriteOptions } from '@protobuf-ts/runtime'
import type { IBinaryWriter } from '@protobuf-ts/runtime'
import type { BinaryReadOptions } from '@protobuf-ts/runtime'
import type { IBinaryReader } from '@protobuf-ts/runtime'
import type { PartialMessage } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { Duration } from '../../../../../google/protobuf/duration.js'
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TrafficControlParameters
 */
export interface TrafficControlParameters {
    /**
     * In bytes, the maximum amount of base traffic that can be accumulated
     *
     * @generated from protobuf field: uint64 max_base_traffic_amount = 1
     */
    maxBaseTrafficAmount: bigint
    /**
     * Maximum duration over which the base rate can be accumulated
     * Consequently, base_traffic_rate = max_base_traffic_amount / max_base_traffic_accumulation_duration
     *
     * @generated from protobuf field: google.protobuf.Duration max_base_traffic_accumulation_duration = 3
     */
    maxBaseTrafficAccumulationDuration?: Duration
    /**
     * Read scaling factor to compute the event cost. In parts per 10 000.
     *
     * @generated from protobuf field: uint32 read_vs_write_scaling_factor = 4
     */
    readVsWriteScalingFactor: number
    /**
     * Window size used to compute the max sequencing time of a submission request
     * This impacts how quickly a submission is expected to be accepted before a retry should be attempted by the caller
     * Default is 5 minutes
     *
     * @generated from protobuf field: google.protobuf.Duration set_balance_request_submission_window_size = 5
     */
    setBalanceRequestSubmissionWindowSize?: Duration
    /**
     * If true, submission requests without enough traffic credit will not be delivered
     *
     * @generated from protobuf field: bool enforce_rate_limiting = 6
     */
    enforceRateLimiting: boolean
    /**
     * In bytes, base event cost added to all sequenced events.
     * Optional
     *
     * @generated from protobuf field: optional uint64 base_event_cost = 7
     */
    baseEventCost?: bigint
}
/**
 * Message representing a traffic receipt included in SequencedEvent receipts to update sender about
 * the traffic consumed state after sequencing of the event
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TrafficReceipt
 */
export interface TrafficReceipt {
    /**
     * Cost effectively consumed by this specific event
     *
     * @generated from protobuf field: uint64 consumed_cost = 1
     */
    consumedCost: bigint
    /**
     * Total amount of extra traffic consumed
     *
     * @generated from protobuf field: uint64 extra_traffic_consumed = 2
     */
    extraTrafficConsumed: bigint
    /**
     * Remaining free base traffic
     *
     * @generated from protobuf field: uint64 base_traffic_remainder = 3
     */
    baseTrafficRemainder: bigint
}
/**
 * Message representing traffic consumed by a member at a given point in time
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TrafficConsumed
 */
export interface TrafficConsumed {
    /**
     * Member consuming the traffic
     *
     * @generated from protobuf field: string member = 1
     */
    member: string
    /**
     * Total extra traffic consumed
     *
     * @generated from protobuf field: uint64 extra_traffic_consumed = 2
     */
    extraTrafficConsumed: bigint
    /**
     * Remaining free base traffic
     *
     * @generated from protobuf field: uint64 base_traffic_remainder = 3
     */
    baseTrafficRemainder: bigint
    /**
     * Cost deducted at `timestamp`, only present when traffic was consumed at `timestamp`, otherwise is set to 0
     *
     * @generated from protobuf field: uint64 last_consumed_cost = 4
     */
    lastConsumedCost: bigint
    /**
     * Timestamp at which this state is valid - this timestamp is used to compute the base traffic remainder above
     *
     * @generated from protobuf field: int64 sequencing_timestamp = 5
     */
    sequencingTimestamp: bigint
}
/**
 * Message representing a traffic purchase made on behalf of a member
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TrafficPurchased
 */
export interface TrafficPurchased {
    /**
     * Member receiving the traffic
     *
     * @generated from protobuf field: string member = 1
     */
    member: string
    /**
     * Serial of the update
     *
     * @generated from protobuf field: uint32 serial = 2
     */
    serial: number
    /**
     * New total extra traffic purchased
     *
     * @generated from protobuf field: uint64 extra_traffic_purchased = 3
     */
    extraTrafficPurchased: bigint
    /**
     * Timestamp at which this state is valid
     *
     * @generated from protobuf field: int64 sequencing_timestamp = 4
     */
    sequencingTimestamp: bigint
}
/**
 * Traffic state of a member at a given timestamp
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TrafficState
 */
export interface TrafficState {
    /**
     * Total amount of extra traffic purchased
     *
     * @generated from protobuf field: int64 extra_traffic_purchased = 1
     */
    extraTrafficPurchased: bigint
    /**
     * Total amount of extra traffic consumed
     *
     * @generated from protobuf field: int64 extra_traffic_consumed = 2
     */
    extraTrafficConsumed: bigint
    /**
     * Amount of base traffic remaining
     *
     * @generated from protobuf field: int64 base_traffic_remainder = 3
     */
    baseTrafficRemainder: bigint
    /**
     * Cost deducted at `timestamp`, only present when traffic was consumed at `timestamp`, otherwise is set to 0
     *
     * @generated from protobuf field: uint64 last_consumed_cost = 4
     */
    lastConsumedCost: bigint
    /**
     * Timestamp at which the state is valid
     *
     * @generated from protobuf field: int64 timestamp = 5
     */
    timestamp: bigint
    /**
     * Optional serial of the balance update that updated the extra traffic limit
     *
     * @generated from protobuf field: optional uint32 serial = 6
     */
    serial?: number
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SetTrafficPurchasedMessage
 */
export interface SetTrafficPurchasedMessage {
    /**
     * Member to update the balance for
     *
     * @generated from protobuf field: string member = 1
     */
    member: string
    /**
     * Serial number - must be unique and monotonically increasing for each new purchase update
     *
     * @generated from protobuf field: uint32 serial = 2
     */
    serial: number
    /**
     * New total traffic purchased entry
     *
     * @generated from protobuf field: uint64 total_traffic_purchased = 4
     */
    totalTrafficPurchased: bigint
    /**
     * @generated from protobuf field: string physical_synchronizer_id = 5
     */
    physicalSynchronizerId: string
}
declare class TrafficControlParameters$Type extends MessageType<TrafficControlParameters> {
    constructor()
    create(
        value?: PartialMessage<TrafficControlParameters>
    ): TrafficControlParameters
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TrafficControlParameters
    ): TrafficControlParameters
    internalBinaryWrite(
        message: TrafficControlParameters,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficControlParameters
 */
export declare const TrafficControlParameters: TrafficControlParameters$Type
declare class TrafficReceipt$Type extends MessageType<TrafficReceipt> {
    constructor()
    create(value?: PartialMessage<TrafficReceipt>): TrafficReceipt
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TrafficReceipt
    ): TrafficReceipt
    internalBinaryWrite(
        message: TrafficReceipt,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficReceipt
 */
export declare const TrafficReceipt: TrafficReceipt$Type
declare class TrafficConsumed$Type extends MessageType<TrafficConsumed> {
    constructor()
    create(value?: PartialMessage<TrafficConsumed>): TrafficConsumed
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TrafficConsumed
    ): TrafficConsumed
    internalBinaryWrite(
        message: TrafficConsumed,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficConsumed
 */
export declare const TrafficConsumed: TrafficConsumed$Type
declare class TrafficPurchased$Type extends MessageType<TrafficPurchased> {
    constructor()
    create(value?: PartialMessage<TrafficPurchased>): TrafficPurchased
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TrafficPurchased
    ): TrafficPurchased
    internalBinaryWrite(
        message: TrafficPurchased,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficPurchased
 */
export declare const TrafficPurchased: TrafficPurchased$Type
declare class TrafficState$Type extends MessageType<TrafficState> {
    constructor()
    create(value?: PartialMessage<TrafficState>): TrafficState
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TrafficState
    ): TrafficState
    internalBinaryWrite(
        message: TrafficState,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TrafficState
 */
export declare const TrafficState: TrafficState$Type
declare class SetTrafficPurchasedMessage$Type extends MessageType<SetTrafficPurchasedMessage> {
    constructor()
    create(
        value?: PartialMessage<SetTrafficPurchasedMessage>
    ): SetTrafficPurchasedMessage
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SetTrafficPurchasedMessage
    ): SetTrafficPurchasedMessage
    internalBinaryWrite(
        message: SetTrafficPurchasedMessage,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SetTrafficPurchasedMessage
 */
export declare const SetTrafficPurchasedMessage: SetTrafficPurchasedMessage$Type
export {}
//# sourceMappingURL=traffic_control_parameters.d.ts.map
