import type { BinaryWriteOptions } from '@protobuf-ts/runtime'
import type { IBinaryWriter } from '@protobuf-ts/runtime'
import type { BinaryReadOptions } from '@protobuf-ts/runtime'
import type { IBinaryReader } from '@protobuf-ts/runtime'
import type { PartialMessage } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { Signature } from '../../crypto/v30/crypto.js'
import { DynamicSequencingParameters } from './sequencing_parameters.js'
import { DynamicSynchronizerParameters } from './synchronizer_parameters.js'
import { Timestamp } from '../../../../../google/protobuf/timestamp.js'
import { ParticipantSynchronizerLimits } from './synchronizer_parameters.js'
import { PublicKey } from '../../crypto/v30/crypto.js'
import { SigningPublicKey } from '../../crypto/v30/crypto.js'
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.Enums
 */
export interface Enums {}
/**
 * @generated from protobuf enum com.digitalasset.canton.protocol.v30.Enums.TopologyChangeOp
 */
export declare enum Enums_TopologyChangeOp {
    /**
     * @generated from protobuf enum value: TOPOLOGY_CHANGE_OP_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * Adds a new or replaces an existing mapping
     *
     * @generated from protobuf enum value: TOPOLOGY_CHANGE_OP_ADD_REPLACE = 1;
     */
    ADD_REPLACE = 1,
    /**
     * Remove an existing mapping
     *
     * @generated from protobuf enum value: TOPOLOGY_CHANGE_OP_REMOVE = 2;
     */
    REMOVE = 2,
}
/**
 * enum indicating the participant permission level
 * Regardless of the ParticipantPermission level, all participants can submit a reassignment.
 *
 * @generated from protobuf enum com.digitalasset.canton.protocol.v30.Enums.ParticipantPermission
 */
export declare enum Enums_ParticipantPermission {
    /**
     * @generated from protobuf enum value: PARTICIPANT_PERMISSION_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * participant is active, can submit transactions and reassignments
     *
     * @generated from protobuf enum value: PARTICIPANT_PERMISSION_SUBMISSION = 1;
     */
    SUBMISSION = 1,
    /**
     * participant is passive, can only confirm transactions and submit reassignments
     *
     * @generated from protobuf enum value: PARTICIPANT_PERMISSION_CONFIRMATION = 2;
     */
    CONFIRMATION = 2,
    /**
     * participant is passive, can only observe transactions and submit reassignments
     *
     * @generated from protobuf enum value: PARTICIPANT_PERMISSION_OBSERVATION = 3;
     */
    OBSERVATION = 3,
}
/**
 * @generated from protobuf enum com.digitalasset.canton.protocol.v30.Enums.TopologyMappingCode
 */
export declare enum Enums_TopologyMappingCode {
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_NAMESPACE_DELEGATION = 1;
     */
    NAMESPACE_DELEGATION = 1,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_DECENTRALIZED_NAMESPACE_DEFINITION = 3;
     */
    DECENTRALIZED_NAMESPACE_DEFINITION = 3,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_OWNER_TO_KEY_MAPPING = 4;
     */
    OWNER_TO_KEY_MAPPING = 4,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_SYNCHRONIZER_TRUST_CERTIFICATE = 5;
     */
    SYNCHRONIZER_TRUST_CERTIFICATE = 5,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_PARTICIPANT_PERMISSION = 6;
     */
    PARTICIPANT_PERMISSION = 6,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_PARTY_HOSTING_LIMITS = 7;
     */
    PARTY_HOSTING_LIMITS = 7,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_VETTED_PACKAGES = 8;
     */
    VETTED_PACKAGES = 8,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_PARTY_TO_PARTICIPANT = 9;
     */
    PARTY_TO_PARTICIPANT = 9,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_SYNCHRONIZER_PARAMETERS_STATE = 11;
     */
    SYNCHRONIZER_PARAMETERS_STATE = 11,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_MEDIATOR_SYNCHRONIZER_STATE = 12;
     */
    MEDIATOR_SYNCHRONIZER_STATE = 12,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_SEQUENCER_SYNCHRONIZER_STATE = 13;
     */
    SEQUENCER_SYNCHRONIZER_STATE = 13,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_PURGE_TOPOLOGY_TXS = 15;
     */
    PURGE_TOPOLOGY_TXS = 15,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_SEQUENCING_DYNAMIC_PARAMETERS_STATE = 17;
     */
    SEQUENCING_DYNAMIC_PARAMETERS_STATE = 17,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_PARTY_TO_KEY_MAPPING = 18;
     */
    PARTY_TO_KEY_MAPPING = 18,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_SYNCHRONIZER_MIGRATION_ANNOUNCEMENT = 19;
     */
    SYNCHRONIZER_MIGRATION_ANNOUNCEMENT = 19,
    /**
     * @generated from protobuf enum value: TOPOLOGY_MAPPING_CODE_SEQUENCER_CONNECTION_SUCCESSOR = 20;
     */
    SEQUENCER_CONNECTION_SUCCESSOR = 20,
}
/**
 * [start NamespaceDelegation definition]
 * namespace delegation (equivalent to X509v3 CA root or intermediate CAs)
 * if is_root_delegation==false, the target key may sign all mappings requiring a signature
 * for the namespace except other NamespaceDelegation mappings.
 * authorization: a namespace delegation is either signed by the root key, or is signed by
 *   a key for which there exists a series of properly authorized namespace delegations
 *   that are ultimately signed by the root key
 * UNIQUE(namespace, target_key)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation
 */
export interface NamespaceDelegation {
    /**
     * fingerprint of the root key defining the namespace
     *
     * @generated from protobuf field: string namespace = 1
     */
    namespace: string
    /**
     * target key of getting full rights on the namespace (if target == namespace, it's a root CA)
     *
     * @generated from protobuf field: com.digitalasset.canton.crypto.v30.SigningPublicKey target_key = 2
     */
    targetKey?: SigningPublicKey
    /**
     * flag indicating whether the given delegation is a root delegation or not
     * a root delegation is also allowed to issue other NamespaceDelegations.
     *
     * @deprecated
     * @generated from protobuf field: bool is_root_delegation = 3 [deprecated = true]
     */
    isRootDelegation: boolean
    /**
     * restricts target_key to only sign transactions with the specified mapping types.
     * for backwards compatibility, only the following combinations are valid:
     * * is_root_delegation = true,  restriction = empty: the key can sign all mappings
     * * is_root_delegation = false, restriction = empty: the key can sign all mappings but namespace delegations
     * * is_root_delegation = false, restriction = non-empty: the key can only sign the mappings according the restriction that is set
     *
     * @generated from protobuf oneof: restriction
     */
    restriction:
        | {
              oneofKind: 'canSignAllMappings'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignAllMappings can_sign_all_mappings = 4
               */
              canSignAllMappings: NamespaceDelegation_CanSignAllMappings
          }
        | {
              oneofKind: 'canSignAllButNamespaceDelegations'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignAllButNamespaceDelegations can_sign_all_but_namespace_delegations = 5
               */
              canSignAllButNamespaceDelegations: NamespaceDelegation_CanSignAllButNamespaceDelegations
          }
        | {
              oneofKind: 'canSignSpecificMapings'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignSpecificMappings can_sign_specific_mapings = 6
               */
              canSignSpecificMapings: NamespaceDelegation_CanSignSpecificMappings
          }
        | {
              oneofKind: undefined
          }
}
/**
 * [start-docs-entry: namespace delegation restrictions]
 * the key can sign all currently known mappings and all mappings that will be added in future releases
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignAllMappings
 */
export interface NamespaceDelegation_CanSignAllMappings {}
/**
 * the key can sign all currently known mappings and all mappings that will be added in future releases, except for
 * namespace delegations
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignAllButNamespaceDelegations
 */
export interface NamespaceDelegation_CanSignAllButNamespaceDelegations {}
/**
 * the key can only sign the explicitly specified mappings
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignSpecificMappings
 */
export interface NamespaceDelegation_CanSignSpecificMappings {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.Enums.TopologyMappingCode mappings = 1
     */
    mappings: Enums_TopologyMappingCode[]
}
/**
 * a decentralized namespace definition that creates a new namespace supported by the
 * the original owners
 * authorization: the decentralized namespace definition with serial = 1 must be authorized by all the
 *   owners of the namespace that form the decentralized namespace.
 *   for definitions with serial > 1, we need the authorization of #threshold owners plus
 *   all new owners
 *
 *   any further transaction within the decentralized namespace other than decentralized namespace definitions needs
 *   #threshold signatures of the owners
 *
 * UNIQUE(decentralized_namespace)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.DecentralizedNamespaceDefinition
 */
export interface DecentralizedNamespaceDefinition {
    /**
     * name of the decentralized namespace, computed from the hash of its initial owners
     *
     * @generated from protobuf field: string decentralized_namespace = 1
     */
    decentralizedNamespace: string
    /**
     * the threshold required for any subsequent update signing
     *
     * @generated from protobuf field: int32 threshold = 2
     */
    threshold: number
    /**
     * the namespaces of the owners
     *
     * @generated from protobuf field: repeated string owners = 3
     */
    owners: string[]
}
/**
 * mapping a member (participant, mediator, sequencer) to a key
 * authorization: whoever controls the member uid
 * UNIQUE(member)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.OwnerToKeyMapping
 */
export interface OwnerToKeyMapping {
    /**
     * the sequencing process member
     *
     * @generated from protobuf field: string member = 1
     */
    member: string
    /**
     * the designated keys
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.PublicKey public_keys = 2
     */
    publicKeys: PublicKey[]
}
/**
 * [doc-entry-start: PartyToKeyMapping]
 * mapping a party to a key
 * authorization: whoever controls the party uid
 * UNIQUE(party)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.PartyToKeyMapping
 */
export interface PartyToKeyMapping {
    /**
     * the party
     *
     * @generated from protobuf field: string party = 1
     */
    party: string
    /**
     * the authorization threshold
     *
     * @generated from protobuf field: uint32 threshold = 3
     */
    threshold: number
    /**
     * the designated signing keys
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.SigningPublicKey signing_keys = 4
     */
    signingKeys: SigningPublicKey[]
}
/**
 * the trust certificate issued by the participant confirming that the participant
 * wishes to be present on the given synchronizer
 * authorization: whoever controls the participant uid
 * UNIQUE(participant,synchronizer_id)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SynchronizerTrustCertificate
 */
export interface SynchronizerTrustCertificate {
    /**
     * the uid of the participant
     *
     * @generated from protobuf field: string participant_uid = 1
     */
    participantUid: string
    /**
     * the uid of the synchronizer that the participant trusts
     *
     * @generated from protobuf field: string synchronizer_id = 2
     */
    synchronizerId: string
}
/**
 * the optional trust certificate of the synchronizer towards the participant
 * authorization: whoever controls the synchronizer id
 * UNIQUE(synchronizer_id,participant)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.ParticipantSynchronizerPermission
 */
export interface ParticipantSynchronizerPermission {
    /**
     * @generated from protobuf field: string synchronizer_id = 1
     */
    synchronizerId: string
    /**
     * @generated from protobuf field: string participant_uid = 2
     */
    participantUid: string
    /**
     * the permission level of the participant on this synchronizer (usually submission)
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.Enums.ParticipantPermission permission = 3
     */
    permission: Enums_ParticipantPermission
    /**
     * optional individual limits for this participant
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.ParticipantSynchronizerLimits limits = 4
     */
    limits?: ParticipantSynchronizerLimits
    /**
     * optional earliest time when participant can log in (again)
     * used to temporarily disable participants
     * In microseconds of UTC time since Unix epoch
     *
     * @generated from protobuf field: optional int64 login_after = 5
     */
    loginAfter?: bigint
}
/**
 * the optional hosting limits for a party on a given synchronizer
 * these limits can be used to limit the number of participants that can host a given party
 * authorization: whoever controls the synchronizer id
 * UNIQUE(synchronizer_id,party)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.PartyHostingLimits
 */
export interface PartyHostingLimits {
    /**
     * @generated from protobuf field: string synchronizer_id = 1
     */
    synchronizerId: string
    /**
     * @generated from protobuf field: string party = 2
     */
    party: string
}
/**
 * list of packages supported by this participant
 * authorization: whoever controls the participant uid
 * UNIQUE(participant)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.VettedPackages
 */
export interface VettedPackages {
    /**
     * the participant vetting the packages
     *
     * @generated from protobuf field: string participant_uid = 1
     */
    participantUid: string
    /**
     * DEPRECATED: no longer used, but kept for backwards compatibility.
     * the hashes of the vetted packages.
     * package hashes may only be listed in one of the two fields: package_ids or packages.
     * a package listed in package_ids is equivalent to a package listed in packages with unbounded validity.
     *
     * @deprecated
     * @generated from protobuf field: repeated string package_ids = 2 [deprecated = true]
     */
    packageIds: string[]
    /**
     * the hashes of vetted packages with a validity period.
     * only one entry per package_id is permitted.
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.VettedPackages.VettedPackage packages = 4
     */
    packages: VettedPackages_VettedPackage[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.VettedPackages.VettedPackage
 */
export interface VettedPackages_VettedPackage {
    /**
     * the hash of the vetted package
     *
     * @generated from protobuf field: string package_id = 1
     */
    packageId: string
    /**
     * optional earliest ledger effective time (inclusive) as of which the package is considered valid.
     * must be less than or equal to valid_until if both are present.
     *
     * @generated from protobuf field: google.protobuf.Timestamp valid_from_inclusive = 2
     */
    validFromInclusive?: Timestamp
    /**
     * optional latest ledger effective time (exclusive) until which the package is considered valid.
     * must be greater than or equal to valid_from if both are present.
     *
     * @generated from protobuf field: google.protobuf.Timestamp valid_until_exclusive = 3
     */
    validUntilExclusive?: Timestamp
}
/**
 * mapping that maps a party to a participant
 * authorization: whoever controls the party and all the owners of the participants that
 *   were not already present in the tx with serial = n - 1
 *   exception:
 *     - a participant can disassociate itself with the party unilaterally as long there will be
 *       enough participants to reach "threshold" during confirmation. The disassociating participant
 *       must lower the threshold by one, if otherwise the number of hosting participants would go
 *       below the threshold.
 * UNIQUE(party)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.PartyToParticipant
 */
export interface PartyToParticipant {
    /**
     * the party that is to be represented by the participants
     *
     * @generated from protobuf field: string party = 1
     */
    party: string
    /**
     * the signatory threshold required by the participants to be able to act on behalf of the party.
     * a mapping with threshold > 1 is considered a definition of a consortium party
     *
     * @generated from protobuf field: uint32 threshold = 2
     */
    threshold: number
    /**
     * which participants will host the party.
     * if threshold > 1, must be Confirmation or Observation
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.PartyToParticipant.HostingParticipant participants = 3
     */
    participants: PartyToParticipant_HostingParticipant[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.PartyToParticipant.HostingParticipant
 */
export interface PartyToParticipant_HostingParticipant {
    /**
     * the target participant that the party should be mapped to
     *
     * @generated from protobuf field: string participant_uid = 1
     */
    participantUid: string
    /**
     * permission of the participant for this particular party (the actual
     * will be min of ParticipantSynchronizerPermission.ParticipantPermission and this setting)
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.Enums.ParticipantPermission permission = 2
     */
    permission: Enums_ParticipantPermission
    /**
     * optional, present iff the party is being onboarded to the participant
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PartyToParticipant.HostingParticipant.Onboarding onboarding = 3
     */
    onboarding?: PartyToParticipant_HostingParticipant_Onboarding
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.PartyToParticipant.HostingParticipant.Onboarding
 */
export interface PartyToParticipant_HostingParticipant_Onboarding {}
/**
 * which dynamic synchronizer parameters are supposed to be used on the given synchronizer
 * authorization: whoever controls the synchronizer
 * UNIQUE(synchronizer_id)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SynchronizerParametersState
 */
export interface SynchronizerParametersState {
    /**
     * synchronizer affected by the new synchronizer parameters
     *
     * @generated from protobuf field: string synchronizer_id = 1
     */
    synchronizerId: string
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.DynamicSynchronizerParameters synchronizer_parameters = 2
     */
    synchronizerParameters?: DynamicSynchronizerParameters
}
/**
 * which sequencing dynamic parameters are supposed to be used on the given synchronizer; defaults are used when not set
 * authorization: whoever controls the synchronizer
 * UNIQUE(synchronizer_id)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.DynamicSequencingParametersState
 */
export interface DynamicSequencingParametersState {
    /**
     * synchronizer affected by the new synchronizer parameters
     *
     * @generated from protobuf field: string synchronizer_id = 1
     */
    synchronizerId: string
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.DynamicSequencingParameters sequencing_parameters = 2
     */
    sequencingParameters?: DynamicSequencingParameters
}
/**
 * which mediators and mediator groups are active on the given synchronizer
 * authorization: whoever controls the synchronizer
 * UNIQUE(synchronizer_id, group)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.MediatorSynchronizerState
 */
export interface MediatorSynchronizerState {
    /**
     * the synchronizer id of the mediator group
     *
     * @generated from protobuf field: string synchronizer_id = 1
     */
    synchronizerId: string
    /**
     * the group-id used for sharding multiple mediator groups
     *
     * @generated from protobuf field: uint32 group = 2
     */
    group: number
    /**
     * the signature threshold required to reach consensus among the mediators
     *
     * @generated from protobuf field: uint32 threshold = 3
     */
    threshold: number
    /**
     * the list of active mediators (uid) within the group
     *
     * @generated from protobuf field: repeated string active = 4
     */
    active: string[]
    /**
     * the list of observing mediators (uid) within the group (read messages but don't respond)
     *
     * @generated from protobuf field: repeated string observers = 5
     */
    observers: string[]
}
/**
 * which sequencers are active on the given synchronizer
 * authorization: whoever controls the synchronizer
 * UNIQUE(synchronizer_id)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SequencerSynchronizerState
 */
export interface SequencerSynchronizerState {
    /**
     * the synchronizer id of the sequencer group
     *
     * @generated from protobuf field: string synchronizer_id = 1
     */
    synchronizerId: string
    /**
     * The system can tolerate up to min(threshold - 1, (activeWithSigningKey.size - 1)/3) malicious active sequencers,
     * where activeWithSigningKey is the set of sequencers from active that have an active OwnerToKeyMapping with a signing key.
     * In order to make the system resilient against f malicious active sequencers, you need to:
     * (1) configure threshold := f + 1,
     * (2) possibly add active sequencers such that f <= (activeWithSigningKey.size - 1)/3.
     * (3) possibly register signing keys for active sequencers,
     *
     * @generated from protobuf field: uint32 threshold = 2
     */
    threshold: number
    /**
     * the list of active sequencers
     * If a sequencer without an active signing key is added to this set, it has no effect on the topology state.
     *
     * @generated from protobuf field: repeated string active = 3
     */
    active: string[]
    /**
     * the list of observing sequencers (uid) within the group (read messages but don't respond)
     *
     * @generated from protobuf field: repeated string observers = 4
     */
    observers: string[]
}
/**
 * explicitly invalidate topology transactions for good
 * this can be used by the synchronizer to offboard participants forcefully or to
 * remove stray topology transactions
 * authorization: whoever controls the synchronizer
 * UNIQUE(synchronizer_id)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.PurgeTopologyTransaction
 */
export interface PurgeTopologyTransaction {
    /**
     * the synchronizer id
     *
     * @generated from protobuf field: string synchronizer_id = 1
     */
    synchronizerId: string
    /**
     * the list of mappings to remove from this synchronizer
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.TopologyMapping mappings = 2
     */
    mappings: TopologyMapping[]
}
/**
 * indicates the beginning of a synchronizer upgrade and effectuates a topology freeze,
 * after which only synchronizer upgrade specific topology mappings are accepted.
 * removing this mapping unfreezes the topology state again.
 * authorization: whoever controls the physical synchronizer
 * UNIQUE(physical_synchronizer_id)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SynchronizerUpgradeAnnouncement
 */
export interface SynchronizerUpgradeAnnouncement {
    /**
     * the physical synchronizer id
     * TODO(#25576) revisit the usage of physical synchronizer ids to refer to the "current synchronizer"
     *
     * @generated from protobuf field: string physical_synchronizer_id = 1
     */
    physicalSynchronizerId: string
    /**
     * the physical synchronizer id of the successor synchronizer
     *
     * @generated from protobuf field: string successor_physical_synchronizer_id = 2
     */
    successorPhysicalSynchronizerId: string
    /**
     * when the upgrade happens
     *
     * @generated from protobuf field: google.protobuf.Timestamp upgrade_time = 3
     */
    upgradeTime?: Timestamp
}
/**
 * a sequencer can announce its connections on the successor synchronizer
 * authorization: the owner of the sequencer's namespace
 * UNIQUE(sequencer_id)
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor
 */
export interface SequencerConnectionSuccessor {
    /**
     * the sequencer id
     *
     * @generated from protobuf field: string sequencer_id = 1
     */
    sequencerId: string
    /**
     * to physical synchronizer id
     * TODO(#25576) revisit the usage of physical synchronizer ids to refer to the "current synchronizer"
     *
     * @generated from protobuf field: string physical_synchronizer_id = 2
     */
    physicalSynchronizerId: string
    /**
     * the connection details with which members can connect to the sequencer on the successor synchronizer
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor.SequencerConnection connection = 3
     */
    connection?: SequencerConnectionSuccessor_SequencerConnection
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor.SequencerConnection
 */
export interface SequencerConnectionSuccessor_SequencerConnection {
    /**
     * @generated from protobuf oneof: connection_type
     */
    connectionType:
        | {
              oneofKind: 'grpc'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor.SequencerConnection.Grpc grpc = 1
               */
              grpc: SequencerConnectionSuccessor_SequencerConnection_Grpc
          }
        | {
              oneofKind: undefined
          }
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor.SequencerConnection.Grpc
 */
export interface SequencerConnectionSuccessor_SequencerConnection_Grpc {
    /**
     * connection information to sequencer (http[s]://<host>:<port>")
     * all endpoints must agree on using HTTPS or HTTP
     *
     * @generated from protobuf field: repeated string endpoints = 1
     */
    endpoints: string[]
    /**
     * @generated from protobuf field: optional bytes custom_trust_certificates = 2
     */
    customTrustCertificates?: Uint8Array
}
/**
 * [docs-entry-start: topology mapping]
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TopologyMapping
 */
export interface TopologyMapping {
    /**
     * @generated from protobuf oneof: mapping
     */
    mapping:
        | {
              oneofKind: 'namespaceDelegation'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.NamespaceDelegation namespace_delegation = 1
               */
              namespaceDelegation: NamespaceDelegation
          }
        | {
              oneofKind: 'decentralizedNamespaceDefinition'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.DecentralizedNamespaceDefinition decentralized_namespace_definition = 3
               */
              decentralizedNamespaceDefinition: DecentralizedNamespaceDefinition
          }
        | {
              oneofKind: 'ownerToKeyMapping'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.OwnerToKeyMapping owner_to_key_mapping = 4
               */
              ownerToKeyMapping: OwnerToKeyMapping
          }
        | {
              oneofKind: 'synchronizerTrustCertificate'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SynchronizerTrustCertificate synchronizer_trust_certificate = 5
               */
              synchronizerTrustCertificate: SynchronizerTrustCertificate
          }
        | {
              oneofKind: 'participantPermission'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.ParticipantSynchronizerPermission participant_permission = 6
               */
              participantPermission: ParticipantSynchronizerPermission
          }
        | {
              oneofKind: 'partyHostingLimits'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PartyHostingLimits party_hosting_limits = 7
               */
              partyHostingLimits: PartyHostingLimits
          }
        | {
              oneofKind: 'vettedPackages'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.VettedPackages vetted_packages = 8
               */
              vettedPackages: VettedPackages
          }
        | {
              oneofKind: 'partyToParticipant'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PartyToParticipant party_to_participant = 9
               */
              partyToParticipant: PartyToParticipant
          }
        | {
              oneofKind: 'synchronizerParametersState'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SynchronizerParametersState synchronizer_parameters_state = 11
               */
              synchronizerParametersState: SynchronizerParametersState
          }
        | {
              oneofKind: 'mediatorSynchronizerState'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.MediatorSynchronizerState mediator_synchronizer_state = 12
               */
              mediatorSynchronizerState: MediatorSynchronizerState
          }
        | {
              oneofKind: 'sequencerSynchronizerState'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SequencerSynchronizerState sequencer_synchronizer_state = 13
               */
              sequencerSynchronizerState: SequencerSynchronizerState
          }
        | {
              oneofKind: 'purgeTopologyTxs'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PurgeTopologyTransaction purge_topology_txs = 14
               */
              purgeTopologyTxs: PurgeTopologyTransaction
          }
        | {
              oneofKind: 'sequencingDynamicParametersState'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.DynamicSequencingParametersState sequencing_dynamic_parameters_state = 15
               */
              sequencingDynamicParametersState: DynamicSequencingParametersState
          }
        | {
              oneofKind: 'partyToKeyMapping'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PartyToKeyMapping party_to_key_mapping = 16
               */
              partyToKeyMapping: PartyToKeyMapping
          }
        | {
              oneofKind: 'synchronizerUpgradeAnnouncement'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SynchronizerUpgradeAnnouncement synchronizer_upgrade_announcement = 17
               */
              synchronizerUpgradeAnnouncement: SynchronizerUpgradeAnnouncement
          }
        | {
              oneofKind: 'sequencerConnectionSuccessor'
              /**
               * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor sequencer_connection_successor = 18
               */
              sequencerConnectionSuccessor: SequencerConnectionSuccessor
          }
        | {
              oneofKind: undefined
          }
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TopologyTransaction
 */
export interface TopologyTransaction {
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.Enums.TopologyChangeOp operation = 1
     */
    operation: Enums_TopologyChangeOp
    /**
     * Serial identifier of this transaction used to prevent replay attacks.
     * A topology transaction is replacing the existing transaction with serial - 1
     * that has the same unique key.
     *
     * @generated from protobuf field: uint32 serial = 2
     */
    serial: number
    /**
     * the element of this topology transaction
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.TopologyMapping mapping = 3
     */
    mapping?: TopologyMapping
}
/**
 * Used in SignedTopologyTransaction to bundle together multiple transaction hashes
 * Allows submitters to only sign a single combined hash to authorize multiple transactions at once
 * The combined hash is computed from the transaction hashes
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.MultiTransactionSignatures
 */
export interface MultiTransactionSignatures {
    /**
     * List of topology transaction hashes.
     * Required
     *
     * @generated from protobuf field: repeated bytes transaction_hashes = 1
     */
    transactionHashes: Uint8Array[]
    /**
     * Signatures on the combined hash computed over the transaction_hashes
     * MUST contain at least one
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.Signature signatures = 2
     */
    signatures: Signature[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SignedTopologyTransaction
 */
export interface SignedTopologyTransaction {
    /**
     * serialized topology transaction (protobuf bytestring)
     *
     * @generated from protobuf field: bytes transaction = 1
     */
    transaction: Uint8Array
    /**
     * multiple signatures
     * Either this field OR the multi_transaction_signatures field MUST contain at least one signature
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.crypto.v30.Signature signatures = 2
     */
    signatures: Signature[]
    /**
     * if true, this transaction is just a proposal. this means that every signature is valid,
     * but the signatures are insufficient to properly authorize the transaction.
     * proposals are distributed via the topology channel too. proposals will be pruned automatically
     * when the nodes are pruned
     * TODO(#14045) implement pruning
     *
     * @generated from protobuf field: bool proposal = 3
     */
    proposal: boolean
    /**
     * If set, the transaction may be authorized by signing a hash computed from multiple transaction hashes
     * This allows to effectively authorize multiple transactions with a single signature.
     * Each item MUST contain the hash of this transaction
     * Optional
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.MultiTransactionSignatures multi_transaction_signatures = 4
     */
    multiTransactionSignatures: MultiTransactionSignatures[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.SignedTopologyTransactions
 */
export interface SignedTopologyTransactions {
    /**
     * serialized signed topology transaction (protobuf bytestring)
     *
     * @generated from protobuf field: repeated bytes signed_transaction = 1
     */
    signedTransaction: Uint8Array[]
}
/**
 * * Accepted topology transaction
 *
 * A member sends topology transactions to the topology transaction broadcast address.
 * The transactions are validated by all members individually against their respective synchronizer store,
 * including the member the submitted the broadcast.
 *
 * @generated from protobuf message com.digitalasset.canton.protocol.v30.TopologyTransactionsBroadcast
 */
export interface TopologyTransactionsBroadcast {
    /**
     * @generated from protobuf field: string physical_synchronizer_id = 1
     */
    physicalSynchronizerId: string
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SignedTopologyTransactions signed_transactions = 2
     */
    signedTransactions?: SignedTopologyTransactions
}
declare class Enums$Type extends MessageType<Enums> {
    constructor()
    create(value?: PartialMessage<Enums>): Enums
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: Enums
    ): Enums
    internalBinaryWrite(
        message: Enums,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.Enums
 */
export declare const Enums: Enums$Type
declare class NamespaceDelegation$Type extends MessageType<NamespaceDelegation> {
    constructor()
    create(value?: PartialMessage<NamespaceDelegation>): NamespaceDelegation
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: NamespaceDelegation
    ): NamespaceDelegation
    internalBinaryWrite(
        message: NamespaceDelegation,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation
 */
export declare const NamespaceDelegation: NamespaceDelegation$Type
declare class NamespaceDelegation_CanSignAllMappings$Type extends MessageType<NamespaceDelegation_CanSignAllMappings> {
    constructor()
    create(
        value?: PartialMessage<NamespaceDelegation_CanSignAllMappings>
    ): NamespaceDelegation_CanSignAllMappings
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: NamespaceDelegation_CanSignAllMappings
    ): NamespaceDelegation_CanSignAllMappings
    internalBinaryWrite(
        message: NamespaceDelegation_CanSignAllMappings,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignAllMappings
 */
export declare const NamespaceDelegation_CanSignAllMappings: NamespaceDelegation_CanSignAllMappings$Type
declare class NamespaceDelegation_CanSignAllButNamespaceDelegations$Type extends MessageType<NamespaceDelegation_CanSignAllButNamespaceDelegations> {
    constructor()
    create(
        value?: PartialMessage<NamespaceDelegation_CanSignAllButNamespaceDelegations>
    ): NamespaceDelegation_CanSignAllButNamespaceDelegations
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: NamespaceDelegation_CanSignAllButNamespaceDelegations
    ): NamespaceDelegation_CanSignAllButNamespaceDelegations
    internalBinaryWrite(
        message: NamespaceDelegation_CanSignAllButNamespaceDelegations,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignAllButNamespaceDelegations
 */
export declare const NamespaceDelegation_CanSignAllButNamespaceDelegations: NamespaceDelegation_CanSignAllButNamespaceDelegations$Type
declare class NamespaceDelegation_CanSignSpecificMappings$Type extends MessageType<NamespaceDelegation_CanSignSpecificMappings> {
    constructor()
    create(
        value?: PartialMessage<NamespaceDelegation_CanSignSpecificMappings>
    ): NamespaceDelegation_CanSignSpecificMappings
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: NamespaceDelegation_CanSignSpecificMappings
    ): NamespaceDelegation_CanSignSpecificMappings
    internalBinaryWrite(
        message: NamespaceDelegation_CanSignSpecificMappings,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.NamespaceDelegation.CanSignSpecificMappings
 */
export declare const NamespaceDelegation_CanSignSpecificMappings: NamespaceDelegation_CanSignSpecificMappings$Type
declare class DecentralizedNamespaceDefinition$Type extends MessageType<DecentralizedNamespaceDefinition> {
    constructor()
    create(
        value?: PartialMessage<DecentralizedNamespaceDefinition>
    ): DecentralizedNamespaceDefinition
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: DecentralizedNamespaceDefinition
    ): DecentralizedNamespaceDefinition
    internalBinaryWrite(
        message: DecentralizedNamespaceDefinition,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.DecentralizedNamespaceDefinition
 */
export declare const DecentralizedNamespaceDefinition: DecentralizedNamespaceDefinition$Type
declare class OwnerToKeyMapping$Type extends MessageType<OwnerToKeyMapping> {
    constructor()
    create(value?: PartialMessage<OwnerToKeyMapping>): OwnerToKeyMapping
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: OwnerToKeyMapping
    ): OwnerToKeyMapping
    internalBinaryWrite(
        message: OwnerToKeyMapping,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.OwnerToKeyMapping
 */
export declare const OwnerToKeyMapping: OwnerToKeyMapping$Type
declare class PartyToKeyMapping$Type extends MessageType<PartyToKeyMapping> {
    constructor()
    create(value?: PartialMessage<PartyToKeyMapping>): PartyToKeyMapping
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PartyToKeyMapping
    ): PartyToKeyMapping
    internalBinaryWrite(
        message: PartyToKeyMapping,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.PartyToKeyMapping
 */
export declare const PartyToKeyMapping: PartyToKeyMapping$Type
declare class SynchronizerTrustCertificate$Type extends MessageType<SynchronizerTrustCertificate> {
    constructor()
    create(
        value?: PartialMessage<SynchronizerTrustCertificate>
    ): SynchronizerTrustCertificate
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SynchronizerTrustCertificate
    ): SynchronizerTrustCertificate
    internalBinaryWrite(
        message: SynchronizerTrustCertificate,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SynchronizerTrustCertificate
 */
export declare const SynchronizerTrustCertificate: SynchronizerTrustCertificate$Type
declare class ParticipantSynchronizerPermission$Type extends MessageType<ParticipantSynchronizerPermission> {
    constructor()
    create(
        value?: PartialMessage<ParticipantSynchronizerPermission>
    ): ParticipantSynchronizerPermission
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ParticipantSynchronizerPermission
    ): ParticipantSynchronizerPermission
    internalBinaryWrite(
        message: ParticipantSynchronizerPermission,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.ParticipantSynchronizerPermission
 */
export declare const ParticipantSynchronizerPermission: ParticipantSynchronizerPermission$Type
declare class PartyHostingLimits$Type extends MessageType<PartyHostingLimits> {
    constructor()
    create(value?: PartialMessage<PartyHostingLimits>): PartyHostingLimits
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PartyHostingLimits
    ): PartyHostingLimits
    internalBinaryWrite(
        message: PartyHostingLimits,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.PartyHostingLimits
 */
export declare const PartyHostingLimits: PartyHostingLimits$Type
declare class VettedPackages$Type extends MessageType<VettedPackages> {
    constructor()
    create(value?: PartialMessage<VettedPackages>): VettedPackages
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: VettedPackages
    ): VettedPackages
    internalBinaryWrite(
        message: VettedPackages,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.VettedPackages
 */
export declare const VettedPackages: VettedPackages$Type
declare class VettedPackages_VettedPackage$Type extends MessageType<VettedPackages_VettedPackage> {
    constructor()
    create(
        value?: PartialMessage<VettedPackages_VettedPackage>
    ): VettedPackages_VettedPackage
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: VettedPackages_VettedPackage
    ): VettedPackages_VettedPackage
    internalBinaryWrite(
        message: VettedPackages_VettedPackage,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.VettedPackages.VettedPackage
 */
export declare const VettedPackages_VettedPackage: VettedPackages_VettedPackage$Type
declare class PartyToParticipant$Type extends MessageType<PartyToParticipant> {
    constructor()
    create(value?: PartialMessage<PartyToParticipant>): PartyToParticipant
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PartyToParticipant
    ): PartyToParticipant
    internalBinaryWrite(
        message: PartyToParticipant,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.PartyToParticipant
 */
export declare const PartyToParticipant: PartyToParticipant$Type
declare class PartyToParticipant_HostingParticipant$Type extends MessageType<PartyToParticipant_HostingParticipant> {
    constructor()
    create(
        value?: PartialMessage<PartyToParticipant_HostingParticipant>
    ): PartyToParticipant_HostingParticipant
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PartyToParticipant_HostingParticipant
    ): PartyToParticipant_HostingParticipant
    internalBinaryWrite(
        message: PartyToParticipant_HostingParticipant,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.PartyToParticipant.HostingParticipant
 */
export declare const PartyToParticipant_HostingParticipant: PartyToParticipant_HostingParticipant$Type
declare class PartyToParticipant_HostingParticipant_Onboarding$Type extends MessageType<PartyToParticipant_HostingParticipant_Onboarding> {
    constructor()
    create(
        value?: PartialMessage<PartyToParticipant_HostingParticipant_Onboarding>
    ): PartyToParticipant_HostingParticipant_Onboarding
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PartyToParticipant_HostingParticipant_Onboarding
    ): PartyToParticipant_HostingParticipant_Onboarding
    internalBinaryWrite(
        message: PartyToParticipant_HostingParticipant_Onboarding,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.PartyToParticipant.HostingParticipant.Onboarding
 */
export declare const PartyToParticipant_HostingParticipant_Onboarding: PartyToParticipant_HostingParticipant_Onboarding$Type
declare class SynchronizerParametersState$Type extends MessageType<SynchronizerParametersState> {
    constructor()
    create(
        value?: PartialMessage<SynchronizerParametersState>
    ): SynchronizerParametersState
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SynchronizerParametersState
    ): SynchronizerParametersState
    internalBinaryWrite(
        message: SynchronizerParametersState,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SynchronizerParametersState
 */
export declare const SynchronizerParametersState: SynchronizerParametersState$Type
declare class DynamicSequencingParametersState$Type extends MessageType<DynamicSequencingParametersState> {
    constructor()
    create(
        value?: PartialMessage<DynamicSequencingParametersState>
    ): DynamicSequencingParametersState
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: DynamicSequencingParametersState
    ): DynamicSequencingParametersState
    internalBinaryWrite(
        message: DynamicSequencingParametersState,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.DynamicSequencingParametersState
 */
export declare const DynamicSequencingParametersState: DynamicSequencingParametersState$Type
declare class MediatorSynchronizerState$Type extends MessageType<MediatorSynchronizerState> {
    constructor()
    create(
        value?: PartialMessage<MediatorSynchronizerState>
    ): MediatorSynchronizerState
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: MediatorSynchronizerState
    ): MediatorSynchronizerState
    internalBinaryWrite(
        message: MediatorSynchronizerState,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.MediatorSynchronizerState
 */
export declare const MediatorSynchronizerState: MediatorSynchronizerState$Type
declare class SequencerSynchronizerState$Type extends MessageType<SequencerSynchronizerState> {
    constructor()
    create(
        value?: PartialMessage<SequencerSynchronizerState>
    ): SequencerSynchronizerState
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SequencerSynchronizerState
    ): SequencerSynchronizerState
    internalBinaryWrite(
        message: SequencerSynchronizerState,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SequencerSynchronizerState
 */
export declare const SequencerSynchronizerState: SequencerSynchronizerState$Type
declare class PurgeTopologyTransaction$Type extends MessageType<PurgeTopologyTransaction> {
    constructor()
    create(
        value?: PartialMessage<PurgeTopologyTransaction>
    ): PurgeTopologyTransaction
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: PurgeTopologyTransaction
    ): PurgeTopologyTransaction
    internalBinaryWrite(
        message: PurgeTopologyTransaction,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.PurgeTopologyTransaction
 */
export declare const PurgeTopologyTransaction: PurgeTopologyTransaction$Type
declare class SynchronizerUpgradeAnnouncement$Type extends MessageType<SynchronizerUpgradeAnnouncement> {
    constructor()
    create(
        value?: PartialMessage<SynchronizerUpgradeAnnouncement>
    ): SynchronizerUpgradeAnnouncement
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SynchronizerUpgradeAnnouncement
    ): SynchronizerUpgradeAnnouncement
    internalBinaryWrite(
        message: SynchronizerUpgradeAnnouncement,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SynchronizerUpgradeAnnouncement
 */
export declare const SynchronizerUpgradeAnnouncement: SynchronizerUpgradeAnnouncement$Type
declare class SequencerConnectionSuccessor$Type extends MessageType<SequencerConnectionSuccessor> {
    constructor()
    create(
        value?: PartialMessage<SequencerConnectionSuccessor>
    ): SequencerConnectionSuccessor
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SequencerConnectionSuccessor
    ): SequencerConnectionSuccessor
    internalBinaryWrite(
        message: SequencerConnectionSuccessor,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor
 */
export declare const SequencerConnectionSuccessor: SequencerConnectionSuccessor$Type
declare class SequencerConnectionSuccessor_SequencerConnection$Type extends MessageType<SequencerConnectionSuccessor_SequencerConnection> {
    constructor()
    create(
        value?: PartialMessage<SequencerConnectionSuccessor_SequencerConnection>
    ): SequencerConnectionSuccessor_SequencerConnection
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SequencerConnectionSuccessor_SequencerConnection
    ): SequencerConnectionSuccessor_SequencerConnection
    internalBinaryWrite(
        message: SequencerConnectionSuccessor_SequencerConnection,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor.SequencerConnection
 */
export declare const SequencerConnectionSuccessor_SequencerConnection: SequencerConnectionSuccessor_SequencerConnection$Type
declare class SequencerConnectionSuccessor_SequencerConnection_Grpc$Type extends MessageType<SequencerConnectionSuccessor_SequencerConnection_Grpc> {
    constructor()
    create(
        value?: PartialMessage<SequencerConnectionSuccessor_SequencerConnection_Grpc>
    ): SequencerConnectionSuccessor_SequencerConnection_Grpc
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SequencerConnectionSuccessor_SequencerConnection_Grpc
    ): SequencerConnectionSuccessor_SequencerConnection_Grpc
    internalBinaryWrite(
        message: SequencerConnectionSuccessor_SequencerConnection_Grpc,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor.SequencerConnection.Grpc
 */
export declare const SequencerConnectionSuccessor_SequencerConnection_Grpc: SequencerConnectionSuccessor_SequencerConnection_Grpc$Type
declare class TopologyMapping$Type extends MessageType<TopologyMapping> {
    constructor()
    create(value?: PartialMessage<TopologyMapping>): TopologyMapping
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TopologyMapping
    ): TopologyMapping
    internalBinaryWrite(
        message: TopologyMapping,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TopologyMapping
 */
export declare const TopologyMapping: TopologyMapping$Type
declare class TopologyTransaction$Type extends MessageType<TopologyTransaction> {
    constructor()
    create(value?: PartialMessage<TopologyTransaction>): TopologyTransaction
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TopologyTransaction
    ): TopologyTransaction
    internalBinaryWrite(
        message: TopologyTransaction,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TopologyTransaction
 */
export declare const TopologyTransaction: TopologyTransaction$Type
declare class MultiTransactionSignatures$Type extends MessageType<MultiTransactionSignatures> {
    constructor()
    create(
        value?: PartialMessage<MultiTransactionSignatures>
    ): MultiTransactionSignatures
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: MultiTransactionSignatures
    ): MultiTransactionSignatures
    internalBinaryWrite(
        message: MultiTransactionSignatures,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.MultiTransactionSignatures
 */
export declare const MultiTransactionSignatures: MultiTransactionSignatures$Type
declare class SignedTopologyTransaction$Type extends MessageType<SignedTopologyTransaction> {
    constructor()
    create(
        value?: PartialMessage<SignedTopologyTransaction>
    ): SignedTopologyTransaction
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SignedTopologyTransaction
    ): SignedTopologyTransaction
    internalBinaryWrite(
        message: SignedTopologyTransaction,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SignedTopologyTransaction
 */
export declare const SignedTopologyTransaction: SignedTopologyTransaction$Type
declare class SignedTopologyTransactions$Type extends MessageType<SignedTopologyTransactions> {
    constructor()
    create(
        value?: PartialMessage<SignedTopologyTransactions>
    ): SignedTopologyTransactions
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SignedTopologyTransactions
    ): SignedTopologyTransactions
    internalBinaryWrite(
        message: SignedTopologyTransactions,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.SignedTopologyTransactions
 */
export declare const SignedTopologyTransactions: SignedTopologyTransactions$Type
declare class TopologyTransactionsBroadcast$Type extends MessageType<TopologyTransactionsBroadcast> {
    constructor()
    create(
        value?: PartialMessage<TopologyTransactionsBroadcast>
    ): TopologyTransactionsBroadcast
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: TopologyTransactionsBroadcast
    ): TopologyTransactionsBroadcast
    internalBinaryWrite(
        message: TopologyTransactionsBroadcast,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.protocol.v30.TopologyTransactionsBroadcast
 */
export declare const TopologyTransactionsBroadcast: TopologyTransactionsBroadcast$Type
export {}
//# sourceMappingURL=topology.d.ts.map
