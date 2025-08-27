import { ServiceType } from '@protobuf-ts/runtime-rpc'
import type { BinaryWriteOptions } from '@protobuf-ts/runtime'
import type { IBinaryWriter } from '@protobuf-ts/runtime'
import type { BinaryReadOptions } from '@protobuf-ts/runtime'
import type { IBinaryReader } from '@protobuf-ts/runtime'
import type { PartialMessage } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { TopologyTransactions } from './common.js'
import { SequencerConnectionSuccessor } from '../../../protocol/v30/topology.js'
import { SynchronizerUpgradeAnnouncement } from '../../../protocol/v30/topology.js'
import { PurgeTopologyTransaction } from '../../../protocol/v30/topology.js'
import { SequencerSynchronizerState } from '../../../protocol/v30/topology.js'
import { MediatorSynchronizerState } from '../../../protocol/v30/topology.js'
import { DynamicSynchronizerParameters } from '../../../protocol/v30/synchronizer_parameters.js'
import { PartyToParticipant } from '../../../protocol/v30/topology.js'
import { VettedPackages } from '../../../protocol/v30/topology.js'
import { PartyHostingLimits } from '../../../protocol/v30/topology.js'
import { ParticipantSynchronizerPermission } from '../../../protocol/v30/topology.js'
import { SynchronizerTrustCertificate } from '../../../protocol/v30/topology.js'
import { PartyToKeyMapping } from '../../../protocol/v30/topology.js'
import { OwnerToKeyMapping } from '../../../protocol/v30/topology.js'
import { DecentralizedNamespaceDefinition } from '../../../protocol/v30/topology.js'
import { NamespaceDelegation } from '../../../protocol/v30/topology.js'
import { Empty } from '../../../../../../google/protobuf/empty.js'
import { Timestamp } from '../../../../../../google/protobuf/timestamp.js'
import { Enums_TopologyChangeOp } from '../../../protocol/v30/topology.js'
import { StoreId } from './common.js'
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.BaseQuery
 */
export interface BaseQuery {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId store = 1
     */
    store?: StoreId
    /**
     * whether to query only for proposals instead of approved topology mappings
     *
     * @generated from protobuf field: bool proposals = 2
     */
    proposals: boolean
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.Enums.TopologyChangeOp operation = 3
     */
    operation: Enums_TopologyChangeOp
    /**
     * @generated from protobuf oneof: time_query
     */
    timeQuery:
        | {
              oneofKind: 'snapshot'
              /**
               * @generated from protobuf field: google.protobuf.Timestamp snapshot = 5
               */
              snapshot: Timestamp
          }
        | {
              oneofKind: 'headState'
              /**
               * @generated from protobuf field: google.protobuf.Empty head_state = 6
               */
              headState: Empty
          }
        | {
              oneofKind: 'range'
              /**
               * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery.TimeRange range = 7
               */
              range: BaseQuery_TimeRange
          }
        | {
              oneofKind: undefined
          }
    /**
     * @generated from protobuf field: string filter_signed_key = 8
     */
    filterSignedKey: string
    /**
     * @generated from protobuf field: optional int32 protocol_version = 9
     */
    protocolVersion?: number
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.BaseQuery.TimeRange
 */
export interface BaseQuery_TimeRange {
    /**
     * @generated from protobuf field: google.protobuf.Timestamp from = 1
     */
    from?: Timestamp
    /**
     * @generated from protobuf field: google.protobuf.Timestamp until = 2
     */
    until?: Timestamp
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.BaseResult
 */
export interface BaseResult {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId store = 1
     */
    store?: StoreId
    /**
     * @generated from protobuf field: google.protobuf.Timestamp sequenced = 2
     */
    sequenced?: Timestamp
    /**
     * @generated from protobuf field: google.protobuf.Timestamp valid_from = 3
     */
    validFrom?: Timestamp
    /**
     * @generated from protobuf field: google.protobuf.Timestamp valid_until = 4
     */
    validUntil?: Timestamp
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.Enums.TopologyChangeOp operation = 5
     */
    operation: Enums_TopologyChangeOp
    /**
     * @generated from protobuf field: bytes transaction_hash = 6
     */
    transactionHash: Uint8Array
    /**
     * @generated from protobuf field: int32 serial = 7
     */
    serial: number
    /**
     * @generated from protobuf field: repeated string signed_by_fingerprints = 8
     */
    signedByFingerprints: string[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListNamespaceDelegationRequest
 */
export interface ListNamespaceDelegationRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_namespace = 2
     */
    filterNamespace: string
    /**
     * @generated from protobuf field: string filter_target_key_fingerprint = 3
     */
    filterTargetKeyFingerprint: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListNamespaceDelegationResponse
 */
export interface ListNamespaceDelegationResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListNamespaceDelegationResponse.Result results = 1
     */
    results: ListNamespaceDelegationResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListNamespaceDelegationResponse.Result
 */
export interface ListNamespaceDelegationResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.NamespaceDelegation item = 2
     */
    item?: NamespaceDelegation
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListDecentralizedNamespaceDefinitionRequest
 */
export interface ListDecentralizedNamespaceDefinitionRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_namespace = 2
     */
    filterNamespace: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListDecentralizedNamespaceDefinitionResponse
 */
export interface ListDecentralizedNamespaceDefinitionResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListDecentralizedNamespaceDefinitionResponse.Result results = 1
     */
    results: ListDecentralizedNamespaceDefinitionResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListDecentralizedNamespaceDefinitionResponse.Result
 */
export interface ListDecentralizedNamespaceDefinitionResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.DecentralizedNamespaceDefinition item = 2
     */
    item?: DecentralizedNamespaceDefinition
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListOwnerToKeyMappingRequest
 */
export interface ListOwnerToKeyMappingRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_key_owner_type = 2
     */
    filterKeyOwnerType: string
    /**
     * @generated from protobuf field: string filter_key_owner_uid = 3
     */
    filterKeyOwnerUid: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListOwnerToKeyMappingResponse
 */
export interface ListOwnerToKeyMappingResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListOwnerToKeyMappingResponse.Result results = 1
     */
    results: ListOwnerToKeyMappingResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListOwnerToKeyMappingResponse.Result
 */
export interface ListOwnerToKeyMappingResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.OwnerToKeyMapping item = 2
     */
    item?: OwnerToKeyMapping
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToKeyMappingRequest
 */
export interface ListPartyToKeyMappingRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_party = 2
     */
    filterParty: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToKeyMappingResponse
 */
export interface ListPartyToKeyMappingResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListPartyToKeyMappingResponse.Result results = 1
     */
    results: ListPartyToKeyMappingResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToKeyMappingResponse.Result
 */
export interface ListPartyToKeyMappingResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PartyToKeyMapping item = 2
     */
    item?: PartyToKeyMapping
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerTrustCertificateRequest
 */
export interface ListSynchronizerTrustCertificateRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_uid = 2
     */
    filterUid: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerTrustCertificateResponse
 */
export interface ListSynchronizerTrustCertificateResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListSynchronizerTrustCertificateResponse.Result results = 1
     */
    results: ListSynchronizerTrustCertificateResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerTrustCertificateResponse.Result
 */
export interface ListSynchronizerTrustCertificateResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SynchronizerTrustCertificate item = 2
     */
    item?: SynchronizerTrustCertificate
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListParticipantSynchronizerPermissionRequest
 */
export interface ListParticipantSynchronizerPermissionRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_uid = 2
     */
    filterUid: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListParticipantSynchronizerPermissionResponse
 */
export interface ListParticipantSynchronizerPermissionResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListParticipantSynchronizerPermissionResponse.Result results = 1
     */
    results: ListParticipantSynchronizerPermissionResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListParticipantSynchronizerPermissionResponse.Result
 */
export interface ListParticipantSynchronizerPermissionResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.ParticipantSynchronizerPermission item = 2
     */
    item?: ParticipantSynchronizerPermission
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyHostingLimitsRequest
 */
export interface ListPartyHostingLimitsRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_uid = 2
     */
    filterUid: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyHostingLimitsResponse
 */
export interface ListPartyHostingLimitsResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListPartyHostingLimitsResponse.Result results = 1
     */
    results: ListPartyHostingLimitsResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyHostingLimitsResponse.Result
 */
export interface ListPartyHostingLimitsResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PartyHostingLimits item = 2
     */
    item?: PartyHostingLimits
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListVettedPackagesRequest
 */
export interface ListVettedPackagesRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_participant = 2
     */
    filterParticipant: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListVettedPackagesResponse
 */
export interface ListVettedPackagesResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListVettedPackagesResponse.Result results = 1
     */
    results: ListVettedPackagesResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListVettedPackagesResponse.Result
 */
export interface ListVettedPackagesResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.VettedPackages item = 2
     */
    item?: VettedPackages
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToParticipantRequest
 */
export interface ListPartyToParticipantRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_party = 2
     */
    filterParty: string
    /**
     * @generated from protobuf field: string filter_participant = 3
     */
    filterParticipant: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToParticipantResponse
 */
export interface ListPartyToParticipantResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListPartyToParticipantResponse.Result results = 2
     */
    results: ListPartyToParticipantResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToParticipantResponse.Result
 */
export interface ListPartyToParticipantResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PartyToParticipant item = 2
     */
    item?: PartyToParticipant
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerParametersStateRequest
 */
export interface ListSynchronizerParametersStateRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_synchronizer_id = 2
     */
    filterSynchronizerId: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerParametersStateResponse
 */
export interface ListSynchronizerParametersStateResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListSynchronizerParametersStateResponse.Result results = 1
     */
    results: ListSynchronizerParametersStateResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerParametersStateResponse.Result
 */
export interface ListSynchronizerParametersStateResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.DynamicSynchronizerParameters item = 2
     */
    item?: DynamicSynchronizerParameters
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListMediatorSynchronizerStateRequest
 */
export interface ListMediatorSynchronizerStateRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_synchronizer_id = 2
     */
    filterSynchronizerId: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListMediatorSynchronizerStateResponse
 */
export interface ListMediatorSynchronizerStateResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListMediatorSynchronizerStateResponse.Result results = 1
     */
    results: ListMediatorSynchronizerStateResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListMediatorSynchronizerStateResponse.Result
 */
export interface ListMediatorSynchronizerStateResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.MediatorSynchronizerState item = 2
     */
    item?: MediatorSynchronizerState
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerSynchronizerStateRequest
 */
export interface ListSequencerSynchronizerStateRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_synchronizer_id = 2
     */
    filterSynchronizerId: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerSynchronizerStateResponse
 */
export interface ListSequencerSynchronizerStateResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListSequencerSynchronizerStateResponse.Result results = 1
     */
    results: ListSequencerSynchronizerStateResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerSynchronizerStateResponse.Result
 */
export interface ListSequencerSynchronizerStateResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SequencerSynchronizerState item = 2
     */
    item?: SequencerSynchronizerState
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPurgeTopologyTransactionRequest
 */
export interface ListPurgeTopologyTransactionRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_synchronizer_id = 2
     */
    filterSynchronizerId: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPurgeTopologyTransactionResponse
 */
export interface ListPurgeTopologyTransactionResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListPurgeTopologyTransactionResponse.Result results = 1
     */
    results: ListPurgeTopologyTransactionResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListPurgeTopologyTransactionResponse.Result
 */
export interface ListPurgeTopologyTransactionResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.PurgeTopologyTransaction item = 2
     */
    item?: PurgeTopologyTransaction
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerUpgradeAnnouncementRequest
 */
export interface ListSynchronizerUpgradeAnnouncementRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_synchronizer_id = 2
     */
    filterSynchronizerId: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerUpgradeAnnouncementResponse
 */
export interface ListSynchronizerUpgradeAnnouncementResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListSynchronizerUpgradeAnnouncementResponse.Result results = 1
     */
    results: ListSynchronizerUpgradeAnnouncementResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerUpgradeAnnouncementResponse.Result
 */
export interface ListSynchronizerUpgradeAnnouncementResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SynchronizerUpgradeAnnouncement item = 2
     */
    item?: SynchronizerUpgradeAnnouncement
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerConnectionSuccessorRequest
 */
export interface ListSequencerConnectionSuccessorRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: string filter_sequencer_id = 2
     */
    filterSequencerId: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerConnectionSuccessorResponse
 */
export interface ListSequencerConnectionSuccessorResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ListSequencerConnectionSuccessorResponse.Result results = 1
     */
    results: ListSequencerConnectionSuccessorResponse_Result[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerConnectionSuccessorResponse.Result
 */
export interface ListSequencerConnectionSuccessorResponse_Result {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseResult context = 1
     */
    context?: BaseResult
    /**
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SequencerConnectionSuccessor item = 2
     */
    item?: SequencerConnectionSuccessor
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListAvailableStoresRequest
 */
export interface ListAvailableStoresRequest {}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListAvailableStoresResponse
 */
export interface ListAvailableStoresResponse {
    /**
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.StoreId store_ids = 1
     */
    storeIds: StoreId[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListAllRequest
 */
export interface ListAllRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * * The list of topology mappings to exclude from the result.
     *
     * @generated from protobuf field: repeated string exclude_mappings = 2
     */
    excludeMappings: string[]
    /**
     * @generated from protobuf field: string filter_namespace = 3
     */
    filterNamespace: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ExportTopologySnapshotRequest
 */
export interface ExportTopologySnapshotRequest {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.BaseQuery base_query = 1
     */
    baseQuery?: BaseQuery
    /**
     * @generated from protobuf field: repeated string exclude_mappings = 2
     */
    excludeMappings: string[]
    /**
     * @generated from protobuf field: string filter_namespace = 3
     */
    filterNamespace: string
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ListAllResponse
 */
export interface ListAllResponse {
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.TopologyTransactions result = 1
     */
    result?: TopologyTransactions
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ExportTopologySnapshotResponse
 */
export interface ExportTopologySnapshotResponse {
    /**
     * @generated from protobuf field: bytes chunk = 1
     */
    chunk: Uint8Array
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.GenesisStateRequest
 */
export interface GenesisStateRequest {
    /**
     * Must be specified if the genesis state is requested from a participant node.
     *
     * @generated from protobuf field: optional com.digitalasset.canton.topology.admin.v30.StoreId synchronizer_store = 1
     */
    synchronizerStore?: StoreId
    /**
     * Optional - the effective time used to fetch the topology transactions. If not provided the effective time of the last topology transaction is used.
     *
     * @generated from protobuf field: google.protobuf.Timestamp timestamp = 2
     */
    timestamp?: Timestamp
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.GenesisStateResponse
 */
export interface GenesisStateResponse {
    /**
     * versioned stored topology transactions
     *
     * @generated from protobuf field: bytes chunk = 1
     */
    chunk: Uint8Array
}
declare class BaseQuery$Type extends MessageType<BaseQuery> {
    constructor()
    create(value?: PartialMessage<BaseQuery>): BaseQuery
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: BaseQuery
    ): BaseQuery
    internalBinaryWrite(
        message: BaseQuery,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.BaseQuery
 */
export declare const BaseQuery: BaseQuery$Type
declare class BaseQuery_TimeRange$Type extends MessageType<BaseQuery_TimeRange> {
    constructor()
    create(value?: PartialMessage<BaseQuery_TimeRange>): BaseQuery_TimeRange
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: BaseQuery_TimeRange
    ): BaseQuery_TimeRange
    internalBinaryWrite(
        message: BaseQuery_TimeRange,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.BaseQuery.TimeRange
 */
export declare const BaseQuery_TimeRange: BaseQuery_TimeRange$Type
declare class BaseResult$Type extends MessageType<BaseResult> {
    constructor()
    create(value?: PartialMessage<BaseResult>): BaseResult
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: BaseResult
    ): BaseResult
    internalBinaryWrite(
        message: BaseResult,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.BaseResult
 */
export declare const BaseResult: BaseResult$Type
declare class ListNamespaceDelegationRequest$Type extends MessageType<ListNamespaceDelegationRequest> {
    constructor()
    create(
        value?: PartialMessage<ListNamespaceDelegationRequest>
    ): ListNamespaceDelegationRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListNamespaceDelegationRequest
    ): ListNamespaceDelegationRequest
    internalBinaryWrite(
        message: ListNamespaceDelegationRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListNamespaceDelegationRequest
 */
export declare const ListNamespaceDelegationRequest: ListNamespaceDelegationRequest$Type
declare class ListNamespaceDelegationResponse$Type extends MessageType<ListNamespaceDelegationResponse> {
    constructor()
    create(
        value?: PartialMessage<ListNamespaceDelegationResponse>
    ): ListNamespaceDelegationResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListNamespaceDelegationResponse
    ): ListNamespaceDelegationResponse
    internalBinaryWrite(
        message: ListNamespaceDelegationResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListNamespaceDelegationResponse
 */
export declare const ListNamespaceDelegationResponse: ListNamespaceDelegationResponse$Type
declare class ListNamespaceDelegationResponse_Result$Type extends MessageType<ListNamespaceDelegationResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListNamespaceDelegationResponse_Result>
    ): ListNamespaceDelegationResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListNamespaceDelegationResponse_Result
    ): ListNamespaceDelegationResponse_Result
    internalBinaryWrite(
        message: ListNamespaceDelegationResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListNamespaceDelegationResponse.Result
 */
export declare const ListNamespaceDelegationResponse_Result: ListNamespaceDelegationResponse_Result$Type
declare class ListDecentralizedNamespaceDefinitionRequest$Type extends MessageType<ListDecentralizedNamespaceDefinitionRequest> {
    constructor()
    create(
        value?: PartialMessage<ListDecentralizedNamespaceDefinitionRequest>
    ): ListDecentralizedNamespaceDefinitionRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListDecentralizedNamespaceDefinitionRequest
    ): ListDecentralizedNamespaceDefinitionRequest
    internalBinaryWrite(
        message: ListDecentralizedNamespaceDefinitionRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListDecentralizedNamespaceDefinitionRequest
 */
export declare const ListDecentralizedNamespaceDefinitionRequest: ListDecentralizedNamespaceDefinitionRequest$Type
declare class ListDecentralizedNamespaceDefinitionResponse$Type extends MessageType<ListDecentralizedNamespaceDefinitionResponse> {
    constructor()
    create(
        value?: PartialMessage<ListDecentralizedNamespaceDefinitionResponse>
    ): ListDecentralizedNamespaceDefinitionResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListDecentralizedNamespaceDefinitionResponse
    ): ListDecentralizedNamespaceDefinitionResponse
    internalBinaryWrite(
        message: ListDecentralizedNamespaceDefinitionResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListDecentralizedNamespaceDefinitionResponse
 */
export declare const ListDecentralizedNamespaceDefinitionResponse: ListDecentralizedNamespaceDefinitionResponse$Type
declare class ListDecentralizedNamespaceDefinitionResponse_Result$Type extends MessageType<ListDecentralizedNamespaceDefinitionResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListDecentralizedNamespaceDefinitionResponse_Result>
    ): ListDecentralizedNamespaceDefinitionResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListDecentralizedNamespaceDefinitionResponse_Result
    ): ListDecentralizedNamespaceDefinitionResponse_Result
    internalBinaryWrite(
        message: ListDecentralizedNamespaceDefinitionResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListDecentralizedNamespaceDefinitionResponse.Result
 */
export declare const ListDecentralizedNamespaceDefinitionResponse_Result: ListDecentralizedNamespaceDefinitionResponse_Result$Type
declare class ListOwnerToKeyMappingRequest$Type extends MessageType<ListOwnerToKeyMappingRequest> {
    constructor()
    create(
        value?: PartialMessage<ListOwnerToKeyMappingRequest>
    ): ListOwnerToKeyMappingRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListOwnerToKeyMappingRequest
    ): ListOwnerToKeyMappingRequest
    internalBinaryWrite(
        message: ListOwnerToKeyMappingRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListOwnerToKeyMappingRequest
 */
export declare const ListOwnerToKeyMappingRequest: ListOwnerToKeyMappingRequest$Type
declare class ListOwnerToKeyMappingResponse$Type extends MessageType<ListOwnerToKeyMappingResponse> {
    constructor()
    create(
        value?: PartialMessage<ListOwnerToKeyMappingResponse>
    ): ListOwnerToKeyMappingResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListOwnerToKeyMappingResponse
    ): ListOwnerToKeyMappingResponse
    internalBinaryWrite(
        message: ListOwnerToKeyMappingResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListOwnerToKeyMappingResponse
 */
export declare const ListOwnerToKeyMappingResponse: ListOwnerToKeyMappingResponse$Type
declare class ListOwnerToKeyMappingResponse_Result$Type extends MessageType<ListOwnerToKeyMappingResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListOwnerToKeyMappingResponse_Result>
    ): ListOwnerToKeyMappingResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListOwnerToKeyMappingResponse_Result
    ): ListOwnerToKeyMappingResponse_Result
    internalBinaryWrite(
        message: ListOwnerToKeyMappingResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListOwnerToKeyMappingResponse.Result
 */
export declare const ListOwnerToKeyMappingResponse_Result: ListOwnerToKeyMappingResponse_Result$Type
declare class ListPartyToKeyMappingRequest$Type extends MessageType<ListPartyToKeyMappingRequest> {
    constructor()
    create(
        value?: PartialMessage<ListPartyToKeyMappingRequest>
    ): ListPartyToKeyMappingRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyToKeyMappingRequest
    ): ListPartyToKeyMappingRequest
    internalBinaryWrite(
        message: ListPartyToKeyMappingRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToKeyMappingRequest
 */
export declare const ListPartyToKeyMappingRequest: ListPartyToKeyMappingRequest$Type
declare class ListPartyToKeyMappingResponse$Type extends MessageType<ListPartyToKeyMappingResponse> {
    constructor()
    create(
        value?: PartialMessage<ListPartyToKeyMappingResponse>
    ): ListPartyToKeyMappingResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyToKeyMappingResponse
    ): ListPartyToKeyMappingResponse
    internalBinaryWrite(
        message: ListPartyToKeyMappingResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToKeyMappingResponse
 */
export declare const ListPartyToKeyMappingResponse: ListPartyToKeyMappingResponse$Type
declare class ListPartyToKeyMappingResponse_Result$Type extends MessageType<ListPartyToKeyMappingResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListPartyToKeyMappingResponse_Result>
    ): ListPartyToKeyMappingResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyToKeyMappingResponse_Result
    ): ListPartyToKeyMappingResponse_Result
    internalBinaryWrite(
        message: ListPartyToKeyMappingResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToKeyMappingResponse.Result
 */
export declare const ListPartyToKeyMappingResponse_Result: ListPartyToKeyMappingResponse_Result$Type
declare class ListSynchronizerTrustCertificateRequest$Type extends MessageType<ListSynchronizerTrustCertificateRequest> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerTrustCertificateRequest>
    ): ListSynchronizerTrustCertificateRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerTrustCertificateRequest
    ): ListSynchronizerTrustCertificateRequest
    internalBinaryWrite(
        message: ListSynchronizerTrustCertificateRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerTrustCertificateRequest
 */
export declare const ListSynchronizerTrustCertificateRequest: ListSynchronizerTrustCertificateRequest$Type
declare class ListSynchronizerTrustCertificateResponse$Type extends MessageType<ListSynchronizerTrustCertificateResponse> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerTrustCertificateResponse>
    ): ListSynchronizerTrustCertificateResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerTrustCertificateResponse
    ): ListSynchronizerTrustCertificateResponse
    internalBinaryWrite(
        message: ListSynchronizerTrustCertificateResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerTrustCertificateResponse
 */
export declare const ListSynchronizerTrustCertificateResponse: ListSynchronizerTrustCertificateResponse$Type
declare class ListSynchronizerTrustCertificateResponse_Result$Type extends MessageType<ListSynchronizerTrustCertificateResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerTrustCertificateResponse_Result>
    ): ListSynchronizerTrustCertificateResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerTrustCertificateResponse_Result
    ): ListSynchronizerTrustCertificateResponse_Result
    internalBinaryWrite(
        message: ListSynchronizerTrustCertificateResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerTrustCertificateResponse.Result
 */
export declare const ListSynchronizerTrustCertificateResponse_Result: ListSynchronizerTrustCertificateResponse_Result$Type
declare class ListParticipantSynchronizerPermissionRequest$Type extends MessageType<ListParticipantSynchronizerPermissionRequest> {
    constructor()
    create(
        value?: PartialMessage<ListParticipantSynchronizerPermissionRequest>
    ): ListParticipantSynchronizerPermissionRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListParticipantSynchronizerPermissionRequest
    ): ListParticipantSynchronizerPermissionRequest
    internalBinaryWrite(
        message: ListParticipantSynchronizerPermissionRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListParticipantSynchronizerPermissionRequest
 */
export declare const ListParticipantSynchronizerPermissionRequest: ListParticipantSynchronizerPermissionRequest$Type
declare class ListParticipantSynchronizerPermissionResponse$Type extends MessageType<ListParticipantSynchronizerPermissionResponse> {
    constructor()
    create(
        value?: PartialMessage<ListParticipantSynchronizerPermissionResponse>
    ): ListParticipantSynchronizerPermissionResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListParticipantSynchronizerPermissionResponse
    ): ListParticipantSynchronizerPermissionResponse
    internalBinaryWrite(
        message: ListParticipantSynchronizerPermissionResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListParticipantSynchronizerPermissionResponse
 */
export declare const ListParticipantSynchronizerPermissionResponse: ListParticipantSynchronizerPermissionResponse$Type
declare class ListParticipantSynchronizerPermissionResponse_Result$Type extends MessageType<ListParticipantSynchronizerPermissionResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListParticipantSynchronizerPermissionResponse_Result>
    ): ListParticipantSynchronizerPermissionResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListParticipantSynchronizerPermissionResponse_Result
    ): ListParticipantSynchronizerPermissionResponse_Result
    internalBinaryWrite(
        message: ListParticipantSynchronizerPermissionResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListParticipantSynchronizerPermissionResponse.Result
 */
export declare const ListParticipantSynchronizerPermissionResponse_Result: ListParticipantSynchronizerPermissionResponse_Result$Type
declare class ListPartyHostingLimitsRequest$Type extends MessageType<ListPartyHostingLimitsRequest> {
    constructor()
    create(
        value?: PartialMessage<ListPartyHostingLimitsRequest>
    ): ListPartyHostingLimitsRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyHostingLimitsRequest
    ): ListPartyHostingLimitsRequest
    internalBinaryWrite(
        message: ListPartyHostingLimitsRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyHostingLimitsRequest
 */
export declare const ListPartyHostingLimitsRequest: ListPartyHostingLimitsRequest$Type
declare class ListPartyHostingLimitsResponse$Type extends MessageType<ListPartyHostingLimitsResponse> {
    constructor()
    create(
        value?: PartialMessage<ListPartyHostingLimitsResponse>
    ): ListPartyHostingLimitsResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyHostingLimitsResponse
    ): ListPartyHostingLimitsResponse
    internalBinaryWrite(
        message: ListPartyHostingLimitsResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyHostingLimitsResponse
 */
export declare const ListPartyHostingLimitsResponse: ListPartyHostingLimitsResponse$Type
declare class ListPartyHostingLimitsResponse_Result$Type extends MessageType<ListPartyHostingLimitsResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListPartyHostingLimitsResponse_Result>
    ): ListPartyHostingLimitsResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyHostingLimitsResponse_Result
    ): ListPartyHostingLimitsResponse_Result
    internalBinaryWrite(
        message: ListPartyHostingLimitsResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyHostingLimitsResponse.Result
 */
export declare const ListPartyHostingLimitsResponse_Result: ListPartyHostingLimitsResponse_Result$Type
declare class ListVettedPackagesRequest$Type extends MessageType<ListVettedPackagesRequest> {
    constructor()
    create(
        value?: PartialMessage<ListVettedPackagesRequest>
    ): ListVettedPackagesRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListVettedPackagesRequest
    ): ListVettedPackagesRequest
    internalBinaryWrite(
        message: ListVettedPackagesRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListVettedPackagesRequest
 */
export declare const ListVettedPackagesRequest: ListVettedPackagesRequest$Type
declare class ListVettedPackagesResponse$Type extends MessageType<ListVettedPackagesResponse> {
    constructor()
    create(
        value?: PartialMessage<ListVettedPackagesResponse>
    ): ListVettedPackagesResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListVettedPackagesResponse
    ): ListVettedPackagesResponse
    internalBinaryWrite(
        message: ListVettedPackagesResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListVettedPackagesResponse
 */
export declare const ListVettedPackagesResponse: ListVettedPackagesResponse$Type
declare class ListVettedPackagesResponse_Result$Type extends MessageType<ListVettedPackagesResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListVettedPackagesResponse_Result>
    ): ListVettedPackagesResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListVettedPackagesResponse_Result
    ): ListVettedPackagesResponse_Result
    internalBinaryWrite(
        message: ListVettedPackagesResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListVettedPackagesResponse.Result
 */
export declare const ListVettedPackagesResponse_Result: ListVettedPackagesResponse_Result$Type
declare class ListPartyToParticipantRequest$Type extends MessageType<ListPartyToParticipantRequest> {
    constructor()
    create(
        value?: PartialMessage<ListPartyToParticipantRequest>
    ): ListPartyToParticipantRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyToParticipantRequest
    ): ListPartyToParticipantRequest
    internalBinaryWrite(
        message: ListPartyToParticipantRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToParticipantRequest
 */
export declare const ListPartyToParticipantRequest: ListPartyToParticipantRequest$Type
declare class ListPartyToParticipantResponse$Type extends MessageType<ListPartyToParticipantResponse> {
    constructor()
    create(
        value?: PartialMessage<ListPartyToParticipantResponse>
    ): ListPartyToParticipantResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyToParticipantResponse
    ): ListPartyToParticipantResponse
    internalBinaryWrite(
        message: ListPartyToParticipantResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToParticipantResponse
 */
export declare const ListPartyToParticipantResponse: ListPartyToParticipantResponse$Type
declare class ListPartyToParticipantResponse_Result$Type extends MessageType<ListPartyToParticipantResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListPartyToParticipantResponse_Result>
    ): ListPartyToParticipantResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPartyToParticipantResponse_Result
    ): ListPartyToParticipantResponse_Result
    internalBinaryWrite(
        message: ListPartyToParticipantResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPartyToParticipantResponse.Result
 */
export declare const ListPartyToParticipantResponse_Result: ListPartyToParticipantResponse_Result$Type
declare class ListSynchronizerParametersStateRequest$Type extends MessageType<ListSynchronizerParametersStateRequest> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerParametersStateRequest>
    ): ListSynchronizerParametersStateRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerParametersStateRequest
    ): ListSynchronizerParametersStateRequest
    internalBinaryWrite(
        message: ListSynchronizerParametersStateRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerParametersStateRequest
 */
export declare const ListSynchronizerParametersStateRequest: ListSynchronizerParametersStateRequest$Type
declare class ListSynchronizerParametersStateResponse$Type extends MessageType<ListSynchronizerParametersStateResponse> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerParametersStateResponse>
    ): ListSynchronizerParametersStateResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerParametersStateResponse
    ): ListSynchronizerParametersStateResponse
    internalBinaryWrite(
        message: ListSynchronizerParametersStateResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerParametersStateResponse
 */
export declare const ListSynchronizerParametersStateResponse: ListSynchronizerParametersStateResponse$Type
declare class ListSynchronizerParametersStateResponse_Result$Type extends MessageType<ListSynchronizerParametersStateResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerParametersStateResponse_Result>
    ): ListSynchronizerParametersStateResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerParametersStateResponse_Result
    ): ListSynchronizerParametersStateResponse_Result
    internalBinaryWrite(
        message: ListSynchronizerParametersStateResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerParametersStateResponse.Result
 */
export declare const ListSynchronizerParametersStateResponse_Result: ListSynchronizerParametersStateResponse_Result$Type
declare class ListMediatorSynchronizerStateRequest$Type extends MessageType<ListMediatorSynchronizerStateRequest> {
    constructor()
    create(
        value?: PartialMessage<ListMediatorSynchronizerStateRequest>
    ): ListMediatorSynchronizerStateRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListMediatorSynchronizerStateRequest
    ): ListMediatorSynchronizerStateRequest
    internalBinaryWrite(
        message: ListMediatorSynchronizerStateRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListMediatorSynchronizerStateRequest
 */
export declare const ListMediatorSynchronizerStateRequest: ListMediatorSynchronizerStateRequest$Type
declare class ListMediatorSynchronizerStateResponse$Type extends MessageType<ListMediatorSynchronizerStateResponse> {
    constructor()
    create(
        value?: PartialMessage<ListMediatorSynchronizerStateResponse>
    ): ListMediatorSynchronizerStateResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListMediatorSynchronizerStateResponse
    ): ListMediatorSynchronizerStateResponse
    internalBinaryWrite(
        message: ListMediatorSynchronizerStateResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListMediatorSynchronizerStateResponse
 */
export declare const ListMediatorSynchronizerStateResponse: ListMediatorSynchronizerStateResponse$Type
declare class ListMediatorSynchronizerStateResponse_Result$Type extends MessageType<ListMediatorSynchronizerStateResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListMediatorSynchronizerStateResponse_Result>
    ): ListMediatorSynchronizerStateResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListMediatorSynchronizerStateResponse_Result
    ): ListMediatorSynchronizerStateResponse_Result
    internalBinaryWrite(
        message: ListMediatorSynchronizerStateResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListMediatorSynchronizerStateResponse.Result
 */
export declare const ListMediatorSynchronizerStateResponse_Result: ListMediatorSynchronizerStateResponse_Result$Type
declare class ListSequencerSynchronizerStateRequest$Type extends MessageType<ListSequencerSynchronizerStateRequest> {
    constructor()
    create(
        value?: PartialMessage<ListSequencerSynchronizerStateRequest>
    ): ListSequencerSynchronizerStateRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSequencerSynchronizerStateRequest
    ): ListSequencerSynchronizerStateRequest
    internalBinaryWrite(
        message: ListSequencerSynchronizerStateRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerSynchronizerStateRequest
 */
export declare const ListSequencerSynchronizerStateRequest: ListSequencerSynchronizerStateRequest$Type
declare class ListSequencerSynchronizerStateResponse$Type extends MessageType<ListSequencerSynchronizerStateResponse> {
    constructor()
    create(
        value?: PartialMessage<ListSequencerSynchronizerStateResponse>
    ): ListSequencerSynchronizerStateResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSequencerSynchronizerStateResponse
    ): ListSequencerSynchronizerStateResponse
    internalBinaryWrite(
        message: ListSequencerSynchronizerStateResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerSynchronizerStateResponse
 */
export declare const ListSequencerSynchronizerStateResponse: ListSequencerSynchronizerStateResponse$Type
declare class ListSequencerSynchronizerStateResponse_Result$Type extends MessageType<ListSequencerSynchronizerStateResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListSequencerSynchronizerStateResponse_Result>
    ): ListSequencerSynchronizerStateResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSequencerSynchronizerStateResponse_Result
    ): ListSequencerSynchronizerStateResponse_Result
    internalBinaryWrite(
        message: ListSequencerSynchronizerStateResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerSynchronizerStateResponse.Result
 */
export declare const ListSequencerSynchronizerStateResponse_Result: ListSequencerSynchronizerStateResponse_Result$Type
declare class ListPurgeTopologyTransactionRequest$Type extends MessageType<ListPurgeTopologyTransactionRequest> {
    constructor()
    create(
        value?: PartialMessage<ListPurgeTopologyTransactionRequest>
    ): ListPurgeTopologyTransactionRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPurgeTopologyTransactionRequest
    ): ListPurgeTopologyTransactionRequest
    internalBinaryWrite(
        message: ListPurgeTopologyTransactionRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPurgeTopologyTransactionRequest
 */
export declare const ListPurgeTopologyTransactionRequest: ListPurgeTopologyTransactionRequest$Type
declare class ListPurgeTopologyTransactionResponse$Type extends MessageType<ListPurgeTopologyTransactionResponse> {
    constructor()
    create(
        value?: PartialMessage<ListPurgeTopologyTransactionResponse>
    ): ListPurgeTopologyTransactionResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPurgeTopologyTransactionResponse
    ): ListPurgeTopologyTransactionResponse
    internalBinaryWrite(
        message: ListPurgeTopologyTransactionResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPurgeTopologyTransactionResponse
 */
export declare const ListPurgeTopologyTransactionResponse: ListPurgeTopologyTransactionResponse$Type
declare class ListPurgeTopologyTransactionResponse_Result$Type extends MessageType<ListPurgeTopologyTransactionResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListPurgeTopologyTransactionResponse_Result>
    ): ListPurgeTopologyTransactionResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListPurgeTopologyTransactionResponse_Result
    ): ListPurgeTopologyTransactionResponse_Result
    internalBinaryWrite(
        message: ListPurgeTopologyTransactionResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListPurgeTopologyTransactionResponse.Result
 */
export declare const ListPurgeTopologyTransactionResponse_Result: ListPurgeTopologyTransactionResponse_Result$Type
declare class ListSynchronizerUpgradeAnnouncementRequest$Type extends MessageType<ListSynchronizerUpgradeAnnouncementRequest> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerUpgradeAnnouncementRequest>
    ): ListSynchronizerUpgradeAnnouncementRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerUpgradeAnnouncementRequest
    ): ListSynchronizerUpgradeAnnouncementRequest
    internalBinaryWrite(
        message: ListSynchronizerUpgradeAnnouncementRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerUpgradeAnnouncementRequest
 */
export declare const ListSynchronizerUpgradeAnnouncementRequest: ListSynchronizerUpgradeAnnouncementRequest$Type
declare class ListSynchronizerUpgradeAnnouncementResponse$Type extends MessageType<ListSynchronizerUpgradeAnnouncementResponse> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerUpgradeAnnouncementResponse>
    ): ListSynchronizerUpgradeAnnouncementResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerUpgradeAnnouncementResponse
    ): ListSynchronizerUpgradeAnnouncementResponse
    internalBinaryWrite(
        message: ListSynchronizerUpgradeAnnouncementResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerUpgradeAnnouncementResponse
 */
export declare const ListSynchronizerUpgradeAnnouncementResponse: ListSynchronizerUpgradeAnnouncementResponse$Type
declare class ListSynchronizerUpgradeAnnouncementResponse_Result$Type extends MessageType<ListSynchronizerUpgradeAnnouncementResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListSynchronizerUpgradeAnnouncementResponse_Result>
    ): ListSynchronizerUpgradeAnnouncementResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSynchronizerUpgradeAnnouncementResponse_Result
    ): ListSynchronizerUpgradeAnnouncementResponse_Result
    internalBinaryWrite(
        message: ListSynchronizerUpgradeAnnouncementResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSynchronizerUpgradeAnnouncementResponse.Result
 */
export declare const ListSynchronizerUpgradeAnnouncementResponse_Result: ListSynchronizerUpgradeAnnouncementResponse_Result$Type
declare class ListSequencerConnectionSuccessorRequest$Type extends MessageType<ListSequencerConnectionSuccessorRequest> {
    constructor()
    create(
        value?: PartialMessage<ListSequencerConnectionSuccessorRequest>
    ): ListSequencerConnectionSuccessorRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSequencerConnectionSuccessorRequest
    ): ListSequencerConnectionSuccessorRequest
    internalBinaryWrite(
        message: ListSequencerConnectionSuccessorRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerConnectionSuccessorRequest
 */
export declare const ListSequencerConnectionSuccessorRequest: ListSequencerConnectionSuccessorRequest$Type
declare class ListSequencerConnectionSuccessorResponse$Type extends MessageType<ListSequencerConnectionSuccessorResponse> {
    constructor()
    create(
        value?: PartialMessage<ListSequencerConnectionSuccessorResponse>
    ): ListSequencerConnectionSuccessorResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSequencerConnectionSuccessorResponse
    ): ListSequencerConnectionSuccessorResponse
    internalBinaryWrite(
        message: ListSequencerConnectionSuccessorResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerConnectionSuccessorResponse
 */
export declare const ListSequencerConnectionSuccessorResponse: ListSequencerConnectionSuccessorResponse$Type
declare class ListSequencerConnectionSuccessorResponse_Result$Type extends MessageType<ListSequencerConnectionSuccessorResponse_Result> {
    constructor()
    create(
        value?: PartialMessage<ListSequencerConnectionSuccessorResponse_Result>
    ): ListSequencerConnectionSuccessorResponse_Result
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListSequencerConnectionSuccessorResponse_Result
    ): ListSequencerConnectionSuccessorResponse_Result
    internalBinaryWrite(
        message: ListSequencerConnectionSuccessorResponse_Result,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListSequencerConnectionSuccessorResponse.Result
 */
export declare const ListSequencerConnectionSuccessorResponse_Result: ListSequencerConnectionSuccessorResponse_Result$Type
declare class ListAvailableStoresRequest$Type extends MessageType<ListAvailableStoresRequest> {
    constructor()
    create(
        value?: PartialMessage<ListAvailableStoresRequest>
    ): ListAvailableStoresRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListAvailableStoresRequest
    ): ListAvailableStoresRequest
    internalBinaryWrite(
        message: ListAvailableStoresRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListAvailableStoresRequest
 */
export declare const ListAvailableStoresRequest: ListAvailableStoresRequest$Type
declare class ListAvailableStoresResponse$Type extends MessageType<ListAvailableStoresResponse> {
    constructor()
    create(
        value?: PartialMessage<ListAvailableStoresResponse>
    ): ListAvailableStoresResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListAvailableStoresResponse
    ): ListAvailableStoresResponse
    internalBinaryWrite(
        message: ListAvailableStoresResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListAvailableStoresResponse
 */
export declare const ListAvailableStoresResponse: ListAvailableStoresResponse$Type
declare class ListAllRequest$Type extends MessageType<ListAllRequest> {
    constructor()
    create(value?: PartialMessage<ListAllRequest>): ListAllRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListAllRequest
    ): ListAllRequest
    internalBinaryWrite(
        message: ListAllRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListAllRequest
 */
export declare const ListAllRequest: ListAllRequest$Type
declare class ExportTopologySnapshotRequest$Type extends MessageType<ExportTopologySnapshotRequest> {
    constructor()
    create(
        value?: PartialMessage<ExportTopologySnapshotRequest>
    ): ExportTopologySnapshotRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ExportTopologySnapshotRequest
    ): ExportTopologySnapshotRequest
    internalBinaryWrite(
        message: ExportTopologySnapshotRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ExportTopologySnapshotRequest
 */
export declare const ExportTopologySnapshotRequest: ExportTopologySnapshotRequest$Type
declare class ListAllResponse$Type extends MessageType<ListAllResponse> {
    constructor()
    create(value?: PartialMessage<ListAllResponse>): ListAllResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ListAllResponse
    ): ListAllResponse
    internalBinaryWrite(
        message: ListAllResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ListAllResponse
 */
export declare const ListAllResponse: ListAllResponse$Type
declare class ExportTopologySnapshotResponse$Type extends MessageType<ExportTopologySnapshotResponse> {
    constructor()
    create(
        value?: PartialMessage<ExportTopologySnapshotResponse>
    ): ExportTopologySnapshotResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ExportTopologySnapshotResponse
    ): ExportTopologySnapshotResponse
    internalBinaryWrite(
        message: ExportTopologySnapshotResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ExportTopologySnapshotResponse
 */
export declare const ExportTopologySnapshotResponse: ExportTopologySnapshotResponse$Type
declare class GenesisStateRequest$Type extends MessageType<GenesisStateRequest> {
    constructor()
    create(value?: PartialMessage<GenesisStateRequest>): GenesisStateRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: GenesisStateRequest
    ): GenesisStateRequest
    internalBinaryWrite(
        message: GenesisStateRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.GenesisStateRequest
 */
export declare const GenesisStateRequest: GenesisStateRequest$Type
declare class GenesisStateResponse$Type extends MessageType<GenesisStateResponse> {
    constructor()
    create(value?: PartialMessage<GenesisStateResponse>): GenesisStateResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: GenesisStateResponse
    ): GenesisStateResponse
    internalBinaryWrite(
        message: GenesisStateResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.GenesisStateResponse
 */
export declare const GenesisStateResponse: GenesisStateResponse$Type
/**
 * @generated ServiceType for protobuf service com.digitalasset.canton.topology.admin.v30.TopologyManagerReadService
 */
export declare const TopologyManagerReadService: ServiceType
export {}
//# sourceMappingURL=topology_manager_read_service.d.ts.map
