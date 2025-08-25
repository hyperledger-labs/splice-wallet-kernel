import { WireType } from '@protobuf-ts/runtime'
import { UnknownFieldHandler } from '@protobuf-ts/runtime'
import { reflectionMergePartial } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { TrafficControlParameters } from './traffic_control_parameters.js'
import { Duration } from '../../../../../google/protobuf/duration.js'
/**
 * Controls how participants can join the synchronizer
 * Note that currently, only transitions from restricted to unrestricted are supported, but not
 * the other way around.
 *
 * @generated from protobuf enum com.digitalasset.canton.protocol.v30.OnboardingRestriction
 */
export var OnboardingRestriction
;(function (OnboardingRestriction) {
    /**
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_UNSPECIFIED = 0;
     */
    OnboardingRestriction[(OnboardingRestriction['UNSPECIFIED'] = 0)] =
        'UNSPECIFIED'
    /**
     * Any participant can join the synchronizer
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_UNRESTRICTED_OPEN = 1;
     */
    OnboardingRestriction[(OnboardingRestriction['UNRESTRICTED_OPEN'] = 1)] =
        'UNRESTRICTED_OPEN'
    /**
     * No participant can currently join the synchronizer
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_UNRESTRICTED_LOCKED = 2;
     */
    OnboardingRestriction[(OnboardingRestriction['UNRESTRICTED_LOCKED'] = 2)] =
        'UNRESTRICTED_LOCKED'
    /**
     * Only participants with a valid participant synchronizer permission are allowed to join the synchronizer (allowlisting)
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_RESTRICTED_OPEN = 3;
     */
    OnboardingRestriction[(OnboardingRestriction['RESTRICTED_OPEN'] = 3)] =
        'RESTRICTED_OPEN'
    /**
     * No participant can currently join the restricted synchronizer
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_RESTRICTED_LOCKED = 4;
     */
    OnboardingRestriction[(OnboardingRestriction['RESTRICTED_LOCKED'] = 4)] =
        'RESTRICTED_LOCKED'
})(OnboardingRestriction || (OnboardingRestriction = {}))
// @generated message type with reflection information, may provide speed optimized methods
class AcsCommitmentsCatchUpConfig$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.AcsCommitmentsCatchUpConfig',
            [
                {
                    no: 1,
                    name: 'catchup_interval_skip',
                    kind: 'scalar',
                    T: 13 /*ScalarType.UINT32*/,
                },
                {
                    no: 2,
                    name: 'nr_intervals_to_trigger_catchup',
                    kind: 'scalar',
                    T: 13 /*ScalarType.UINT32*/,
                },
            ]
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.catchupIntervalSkip = 0
        message.nrIntervalsToTriggerCatchup = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* uint32 catchup_interval_skip */ 1:
                    message.catchupIntervalSkip = reader.uint32()
                    break
                case /* uint32 nr_intervals_to_trigger_catchup */ 2:
                    message.nrIntervalsToTriggerCatchup = reader.uint32()
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
        /* uint32 catchup_interval_skip = 1; */
        if (message.catchupIntervalSkip !== 0)
            writer.tag(1, WireType.Varint).uint32(message.catchupIntervalSkip)
        /* uint32 nr_intervals_to_trigger_catchup = 2; */
        if (message.nrIntervalsToTriggerCatchup !== 0)
            writer
                .tag(2, WireType.Varint)
                .uint32(message.nrIntervalsToTriggerCatchup)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.AcsCommitmentsCatchUpConfig
 */
export const AcsCommitmentsCatchUpConfig =
    new AcsCommitmentsCatchUpConfig$Type()
// @generated message type with reflection information, may provide speed optimized methods
class ParticipantSynchronizerLimits$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits',
            [
                {
                    no: 1,
                    name: 'confirmation_requests_max_rate',
                    kind: 'scalar',
                    T: 13 /*ScalarType.UINT32*/,
                },
            ]
        )
    }
    create(value) {
        const message = globalThis.Object.create(this.messagePrototype)
        message.confirmationRequestsMaxRate = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* uint32 confirmation_requests_max_rate */ 1:
                    message.confirmationRequestsMaxRate = reader.uint32()
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
        /* uint32 confirmation_requests_max_rate = 1; */
        if (message.confirmationRequestsMaxRate !== 0)
            writer
                .tag(1, WireType.Varint)
                .uint32(message.confirmationRequestsMaxRate)
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits
 */
export const ParticipantSynchronizerLimits =
    new ParticipantSynchronizerLimits$Type()
// @generated message type with reflection information, may provide speed optimized methods
class DynamicSynchronizerParameters$Type extends MessageType {
    constructor() {
        super(
            'com.digitalasset.canton.protocol.v30.DynamicSynchronizerParameters',
            [
                {
                    no: 1,
                    name: 'confirmation_response_timeout',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 2,
                    name: 'mediator_reaction_timeout',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 3,
                    name: 'assignment_exclusivity_timeout',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 4,
                    name: 'topology_change_delay',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 5,
                    name: 'ledger_time_record_time_tolerance',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 6,
                    name: 'reconciliation_interval',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 7,
                    name: 'mediator_deduplication_timeout',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 8,
                    name: 'max_request_size',
                    kind: 'scalar',
                    T: 13 /*ScalarType.UINT32*/,
                },
                {
                    no: 9,
                    name: 'onboarding_restriction',
                    kind: 'enum',
                    T: () => [
                        'com.digitalasset.canton.protocol.v30.OnboardingRestriction',
                        OnboardingRestriction,
                        'ONBOARDING_RESTRICTION_',
                    ],
                },
                {
                    no: 13,
                    name: 'participant_synchronizer_limits',
                    kind: 'message',
                    T: () => ParticipantSynchronizerLimits,
                },
                {
                    no: 15,
                    name: 'sequencer_aggregate_submission_timeout',
                    kind: 'message',
                    T: () => Duration,
                },
                {
                    no: 16,
                    name: 'traffic_control',
                    kind: 'message',
                    T: () => TrafficControlParameters,
                },
                {
                    no: 17,
                    name: 'acs_commitments_catchup',
                    kind: 'message',
                    T: () => AcsCommitmentsCatchUpConfig,
                },
                {
                    no: 18,
                    name: 'preparation_time_record_time_tolerance',
                    kind: 'message',
                    T: () => Duration,
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
        message.maxRequestSize = 0
        message.onboardingRestriction = 0
        if (value !== undefined) reflectionMergePartial(this, message, value)
        return message
    }
    internalBinaryRead(reader, length, options, target) {
        let message = target ?? this.create(),
            end = reader.pos + length
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag()
            switch (fieldNo) {
                case /* google.protobuf.Duration confirmation_response_timeout */ 1:
                    message.confirmationResponseTimeout =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.confirmationResponseTimeout
                        )
                    break
                case /* google.protobuf.Duration mediator_reaction_timeout */ 2:
                    message.mediatorReactionTimeout =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.mediatorReactionTimeout
                        )
                    break
                case /* google.protobuf.Duration assignment_exclusivity_timeout */ 3:
                    message.assignmentExclusivityTimeout =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.assignmentExclusivityTimeout
                        )
                    break
                case /* google.protobuf.Duration topology_change_delay */ 4:
                    message.topologyChangeDelay = Duration.internalBinaryRead(
                        reader,
                        reader.uint32(),
                        options,
                        message.topologyChangeDelay
                    )
                    break
                case /* google.protobuf.Duration ledger_time_record_time_tolerance */ 5:
                    message.ledgerTimeRecordTimeTolerance =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.ledgerTimeRecordTimeTolerance
                        )
                    break
                case /* google.protobuf.Duration reconciliation_interval */ 6:
                    message.reconciliationInterval =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.reconciliationInterval
                        )
                    break
                case /* google.protobuf.Duration mediator_deduplication_timeout */ 7:
                    message.mediatorDeduplicationTimeout =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.mediatorDeduplicationTimeout
                        )
                    break
                case /* uint32 max_request_size */ 8:
                    message.maxRequestSize = reader.uint32()
                    break
                case /* com.digitalasset.canton.protocol.v30.OnboardingRestriction onboarding_restriction */ 9:
                    message.onboardingRestriction = reader.int32()
                    break
                case /* com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits participant_synchronizer_limits */ 13:
                    message.participantSynchronizerLimits =
                        ParticipantSynchronizerLimits.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.participantSynchronizerLimits
                        )
                    break
                case /* google.protobuf.Duration sequencer_aggregate_submission_timeout */ 15:
                    message.sequencerAggregateSubmissionTimeout =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.sequencerAggregateSubmissionTimeout
                        )
                    break
                case /* com.digitalasset.canton.protocol.v30.TrafficControlParameters traffic_control */ 16:
                    message.trafficControl =
                        TrafficControlParameters.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.trafficControl
                        )
                    break
                case /* com.digitalasset.canton.protocol.v30.AcsCommitmentsCatchUpConfig acs_commitments_catchup */ 17:
                    message.acsCommitmentsCatchup =
                        AcsCommitmentsCatchUpConfig.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.acsCommitmentsCatchup
                        )
                    break
                case /* google.protobuf.Duration preparation_time_record_time_tolerance */ 18:
                    message.preparationTimeRecordTimeTolerance =
                        Duration.internalBinaryRead(
                            reader,
                            reader.uint32(),
                            options,
                            message.preparationTimeRecordTimeTolerance
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
        /* google.protobuf.Duration confirmation_response_timeout = 1; */
        if (message.confirmationResponseTimeout)
            Duration.internalBinaryWrite(
                message.confirmationResponseTimeout,
                writer.tag(1, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration mediator_reaction_timeout = 2; */
        if (message.mediatorReactionTimeout)
            Duration.internalBinaryWrite(
                message.mediatorReactionTimeout,
                writer.tag(2, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration assignment_exclusivity_timeout = 3; */
        if (message.assignmentExclusivityTimeout)
            Duration.internalBinaryWrite(
                message.assignmentExclusivityTimeout,
                writer.tag(3, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration topology_change_delay = 4; */
        if (message.topologyChangeDelay)
            Duration.internalBinaryWrite(
                message.topologyChangeDelay,
                writer.tag(4, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration ledger_time_record_time_tolerance = 5; */
        if (message.ledgerTimeRecordTimeTolerance)
            Duration.internalBinaryWrite(
                message.ledgerTimeRecordTimeTolerance,
                writer.tag(5, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration reconciliation_interval = 6; */
        if (message.reconciliationInterval)
            Duration.internalBinaryWrite(
                message.reconciliationInterval,
                writer.tag(6, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration mediator_deduplication_timeout = 7; */
        if (message.mediatorDeduplicationTimeout)
            Duration.internalBinaryWrite(
                message.mediatorDeduplicationTimeout,
                writer.tag(7, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* uint32 max_request_size = 8; */
        if (message.maxRequestSize !== 0)
            writer.tag(8, WireType.Varint).uint32(message.maxRequestSize)
        /* com.digitalasset.canton.protocol.v30.OnboardingRestriction onboarding_restriction = 9; */
        if (message.onboardingRestriction !== 0)
            writer.tag(9, WireType.Varint).int32(message.onboardingRestriction)
        /* com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits participant_synchronizer_limits = 13; */
        if (message.participantSynchronizerLimits)
            ParticipantSynchronizerLimits.internalBinaryWrite(
                message.participantSynchronizerLimits,
                writer.tag(13, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration sequencer_aggregate_submission_timeout = 15; */
        if (message.sequencerAggregateSubmissionTimeout)
            Duration.internalBinaryWrite(
                message.sequencerAggregateSubmissionTimeout,
                writer.tag(15, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.protocol.v30.TrafficControlParameters traffic_control = 16; */
        if (message.trafficControl)
            TrafficControlParameters.internalBinaryWrite(
                message.trafficControl,
                writer.tag(16, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* com.digitalasset.canton.protocol.v30.AcsCommitmentsCatchUpConfig acs_commitments_catchup = 17; */
        if (message.acsCommitmentsCatchup)
            AcsCommitmentsCatchUpConfig.internalBinaryWrite(
                message.acsCommitmentsCatchup,
                writer.tag(17, WireType.LengthDelimited).fork(),
                options
            ).join()
        /* google.protobuf.Duration preparation_time_record_time_tolerance = 18; */
        if (message.preparationTimeRecordTimeTolerance)
            Duration.internalBinaryWrite(
                message.preparationTimeRecordTimeTolerance,
                writer.tag(18, WireType.LengthDelimited).fork(),
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
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.DynamicSynchronizerParameters
 */
export const DynamicSynchronizerParameters =
    new DynamicSynchronizerParameters$Type()
