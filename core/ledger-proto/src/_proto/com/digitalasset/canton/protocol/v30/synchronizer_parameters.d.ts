import type { BinaryWriteOptions } from '@protobuf-ts/runtime'
import type { IBinaryWriter } from '@protobuf-ts/runtime'
import type { BinaryReadOptions } from '@protobuf-ts/runtime'
import type { IBinaryReader } from '@protobuf-ts/runtime'
import type { PartialMessage } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { TrafficControlParameters } from './traffic_control_parameters.js'
import { Duration } from '../../../../../google/protobuf/duration.js'
/**
 * catch-up configuration parameters
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.AcsCommitmentsCatchUpConfig
 */
export interface AcsCommitmentsCatchUpConfig {
    /**
     * @generated from protobuf field: uint32 catchup_interval_skip = 1
     */
    catchupIntervalSkip: number
    /**
     * @generated from protobuf field: uint32 nr_intervals_to_trigger_catchup = 2
     */
    nrIntervalsToTriggerCatchup: number
}
/**
 * individual per participant limits
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits
 */
export interface ParticipantSynchronizerLimits {
    /**
     * @generated from protobuf field: uint32 confirmation_requests_max_rate = 1
     */
    confirmationRequestsMaxRate: number
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.DynamicSynchronizerParameters
 */
export interface DynamicSynchronizerParameters {
    /**
     * @generated from protobuf field: google.protobuf.Duration confirmation_response_timeout = 1
     */
    confirmationResponseTimeout?: Duration
    /**
     * @generated from protobuf field: google.protobuf.Duration mediator_reaction_timeout = 2
     */
    mediatorReactionTimeout?: Duration
    /**
     * @generated from protobuf field: google.protobuf.Duration assignment_exclusivity_timeout = 3
     */
    assignmentExclusivityTimeout?: Duration
    /**
     * @generated from protobuf field: google.protobuf.Duration topology_change_delay = 4
     */
    topologyChangeDelay?: Duration
    /**
     * @generated from protobuf field: google.protobuf.Duration ledger_time_record_time_tolerance = 5
     */
    ledgerTimeRecordTimeTolerance?: Duration
    /**
     * @generated from protobuf field: google.protobuf.Duration reconciliation_interval = 6
     */
    reconciliationInterval?: Duration
    /**
     * @generated from protobuf field: google.protobuf.Duration mediator_deduplication_timeout = 7
     */
    mediatorDeduplicationTimeout?: Duration
    /**
     * @generated from protobuf field: uint32 max_request_size = 8
     */
    maxRequestSize: number
    /**
     * topology related validation parameters
     * permissioned synchronizer: if true, only participants which have been explicitly
     * put on the allow list can onboard to the synchronizer
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.OnboardingRestriction onboarding_restriction = 9
     */
    onboardingRestriction: OnboardingRestriction
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits participant_synchronizer_limits = 13
     */
    participantSynchronizerLimits?: ParticipantSynchronizerLimits
    /**
     * @generated from protobuf field: google.protobuf.Duration sequencer_aggregate_submission_timeout = 15
     */
    sequencerAggregateSubmissionTimeout?: Duration
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.TrafficControlParameters traffic_control = 16
     */
    trafficControl?: TrafficControlParameters
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.AcsCommitmentsCatchUpConfig acs_commitments_catchup = 17
     */
    acsCommitmentsCatchup?: AcsCommitmentsCatchUpConfig
    /**
     * @generated from protobuf field: google.protobuf.Duration preparation_time_record_time_tolerance = 18
     */
    preparationTimeRecordTimeTolerance?: Duration
}
/**
 * Controls how participants can join the synchronizer
 * Note that currently, only transitions from restricted to unrestricted are supported, but not
 * the other way around.
 *
 * @generated from protobuf enum com.digitalasset.canton.protocol.v30.OnboardingRestriction
 */
export declare enum OnboardingRestriction {
    /**
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * Any participant can join the synchronizer
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_UNRESTRICTED_OPEN = 1;
     */
    UNRESTRICTED_OPEN = 1,
    /**
     * No participant can currently join the synchronizer
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_UNRESTRICTED_LOCKED = 2;
     */
    UNRESTRICTED_LOCKED = 2,
    /**
     * Only participants with a valid participant synchronizer permission are allowed to join the synchronizer (allowlisting)
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_RESTRICTED_OPEN = 3;
     */
    RESTRICTED_OPEN = 3,
    /**
     * No participant can currently join the restricted synchronizer
     *
     * @generated from protobuf enum value: ONBOARDING_RESTRICTION_RESTRICTED_LOCKED = 4;
     */
    RESTRICTED_LOCKED = 4,
}
declare class AcsCommitmentsCatchUpConfig$Type extends MessageType<AcsCommitmentsCatchUpConfig> {
    constructor()
    create(
        value?: PartialMessage<AcsCommitmentsCatchUpConfig>
    ): AcsCommitmentsCatchUpConfig
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: AcsCommitmentsCatchUpConfig
    ): AcsCommitmentsCatchUpConfig
    internalBinaryWrite(
        message: AcsCommitmentsCatchUpConfig,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.AcsCommitmentsCatchUpConfig
 */
export declare const AcsCommitmentsCatchUpConfig: AcsCommitmentsCatchUpConfig$Type
declare class ParticipantSynchronizerLimits$Type extends MessageType<ParticipantSynchronizerLimits> {
    constructor()
    create(
        value?: PartialMessage<ParticipantSynchronizerLimits>
    ): ParticipantSynchronizerLimits
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ParticipantSynchronizerLimits
    ): ParticipantSynchronizerLimits
    internalBinaryWrite(
        message: ParticipantSynchronizerLimits,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits
 */
export declare const ParticipantSynchronizerLimits: ParticipantSynchronizerLimits$Type
declare class DynamicSynchronizerParameters$Type extends MessageType<DynamicSynchronizerParameters> {
    constructor()
    create(
        value?: PartialMessage<DynamicSynchronizerParameters>
    ): DynamicSynchronizerParameters
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: DynamicSynchronizerParameters
    ): DynamicSynchronizerParameters
    internalBinaryWrite(
        message: DynamicSynchronizerParameters,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.DynamicSynchronizerParameters
 */
export declare const DynamicSynchronizerParameters: DynamicSynchronizerParameters$Type
export {}
//# sourceMappingURL=synchronizer_parameters.d.ts.map
