import { ServiceType } from '@protobuf-ts/runtime-rpc'
import type { BinaryWriteOptions } from '@protobuf-ts/runtime'
import type { IBinaryWriter } from '@protobuf-ts/runtime'
import type { BinaryReadOptions } from '@protobuf-ts/runtime'
import type { IBinaryReader } from '@protobuf-ts/runtime'
import type { PartialMessage } from '@protobuf-ts/runtime'
import { MessageType } from '@protobuf-ts/runtime'
import { StoreId_Temporary } from './common.js'
import { SignedTopologyTransaction } from '../../../protocol/v30/topology.js'
import { Duration } from '../../../../../../google/protobuf/duration.js'
import { StoreId } from './common.js'
import { TopologyMapping } from '../../../protocol/v30/topology.js'
import { Enums_TopologyChangeOp } from '../../../protocol/v30/topology.js'
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsRequest
 */
export interface GenerateTransactionsRequest {
    /**
     * transaction proposals for which to generate topology transactions
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.GenerateTransactionsRequest.Proposal proposals = 1
     */
    proposals: GenerateTransactionsRequest_Proposal[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsRequest.Proposal
 */
export interface GenerateTransactionsRequest_Proposal {
    /**
     * * Replace / Remove
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.Enums.TopologyChangeOp operation = 1
     */
    operation: Enums_TopologyChangeOp
    /**
     * * Optionally, the serial number of this request (auto-determined if omitted)
     * NOTE: omitting the serial MAY end up overwriting previous mappings processed concurrently.
     * To avoid such cases, First read the state using the TopologyManagerReadService and update the mappings
     * accordingly, incrementing the serial by one and setting it here explicitly.
     *
     * @generated from protobuf field: uint32 serial = 2
     */
    serial: number
    /**
     * * The mapping to be authorized
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.TopologyMapping mapping = 3
     */
    mapping?: TopologyMapping
    /**
     * Target store
     *
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId store = 4
     */
    store?: StoreId
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsResponse
 */
export interface GenerateTransactionsResponse {
    /**
     * Generated transactions, in the same order as the mappings provided in the request
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.GenerateTransactionsResponse.GeneratedTransaction generated_transactions = 1
     */
    generatedTransactions: GenerateTransactionsResponse_GeneratedTransaction[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsResponse.GeneratedTransaction
 */
export interface GenerateTransactionsResponse_GeneratedTransaction {
    /**
     * Serialized com.digitalasset.canton.protocol.v30.TopologyTransaction
     *
     * @generated from protobuf field: bytes serialized_transaction = 1
     */
    serializedTransaction: Uint8Array
    /**
     * Hash of the transaction - this should be signed by the submitter to authorize the transaction
     *
     * @generated from protobuf field: bytes transaction_hash = 2
     */
    transactionHash: Uint8Array
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.AuthorizeRequest
 */
export interface AuthorizeRequest {
    /**
     * @generated from protobuf oneof: type
     */
    type:
        | {
              oneofKind: 'proposal'
              /**
               * *
               * Propose a transaction and distribute it.
               * If authorize if the node has enough signing keys
               *
               * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.AuthorizeRequest.Proposal proposal = 1
               */
              proposal: AuthorizeRequest_Proposal
          }
        | {
              oneofKind: 'transactionHash'
              /**
               * *
               * Authorize a transaction, meaning the node needs to be able to fully sign it locally.
               * Hash is in hexadecimal format.
               *
               * @generated from protobuf field: string transaction_hash = 2
               */
              transactionHash: string
          }
        | {
              oneofKind: undefined
          }
    /**
     * *
     * If true: the transaction is only signed if the new signatures will result in the transaction being fully
     * authorized. Otherwise returns as an error.
     * If false: the transaction is signed and the signature distributed. The transaction may still not be fully
     * authorized and remain as a proposal.
     *
     * @generated from protobuf field: bool must_fully_authorize = 3
     */
    mustFullyAuthorize: boolean
    /**
     * * Force specific changes even if dangerous
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ForceFlag force_changes = 4
     */
    forceChanges: ForceFlag[]
    /**
     * *
     * Fingerprint of the keys signing the authorization
     *
     * The signing key is used to identify a particular `NamespaceDelegation` certificate,
     * which is used to justify the given authorization.
     * Optional, if empty, suitable signing keys available known to the node are automatically selected.
     *
     * @generated from protobuf field: repeated string signed_by = 5
     */
    signedBy: string[]
    /**
     * *
     * The store that is used as the underlying source for executing this request.
     * If `store` is a synchronizer store, the resulting topology transaction will only be available on the respective synchronizer.
     * If `store` is the authorized store, the resulting topology transaction may or may not be synchronized automatically
     * to all synchronizers that the node is currently connected to or will be connected to in the future.
     *
     * Selecting a specific synchronizers store might be necessary, if the transaction to authorize by hash or the previous
     * generation of the submitted proposal is only available on the synchronizers store and not in the authorized store.
     *
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId store = 6
     */
    store?: StoreId
    /**
     * * Optional timeout to wait for the transaction to become effective in the store.
     *
     * @generated from protobuf field: google.protobuf.Duration wait_to_become_effective = 7
     */
    waitToBecomeEffective?: Duration
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.AuthorizeRequest.Proposal
 */
export interface AuthorizeRequest_Proposal {
    /**
     * * Replace / Remove
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.Enums.TopologyChangeOp change = 1
     */
    change: Enums_TopologyChangeOp
    /**
     * * Optionally, the serial number of this request (auto-determined if omitted)
     *
     * @generated from protobuf field: uint32 serial = 2
     */
    serial: number
    /**
     * * The mapping to be authorized
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.TopologyMapping mapping = 3
     */
    mapping?: TopologyMapping
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.AuthorizeResponse
 */
export interface AuthorizeResponse {
    /**
     * * the generated signed topology transaction
     *
     * @generated from protobuf field: com.digitalasset.canton.protocol.v30.SignedTopologyTransaction transaction = 1
     */
    transaction?: SignedTopologyTransaction
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.AddTransactionsRequest
 */
export interface AddTransactionsRequest {
    /**
     * *
     * The transactions that should be added to the target store as indicated by the parameter `store`.
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.SignedTopologyTransaction transactions = 1
     */
    transactions: SignedTopologyTransaction[]
    /**
     * * Force specific changes even if dangerous
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ForceFlag force_changes = 2
     */
    forceChanges: ForceFlag[]
    /**
     * *
     * The store that is used as the underlying source for executing this request.
     * If `store` is a synchronizers store, the resulting topology transaction will only be available on the respective synchronizers.
     * If `store` is the authorized store, the resulting topology transaction may or may not be synchronized automatically
     * to all synchronizers that the node is currently connected to or will be connected to in the future.
     *
     * Selecting a specific synchronizers store might be necessary, if the transaction to authorize by hash or the previous
     * generation of the submitted proposal is only available on the synchronizers store and not in the authorized store.
     *
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId store = 3
     */
    store?: StoreId
    /**
     * * Optional timeout to wait for the transaction to become effective in the store.
     *
     * @generated from protobuf field: google.protobuf.Duration wait_to_become_effective = 7
     */
    waitToBecomeEffective?: Duration
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.AddTransactionsResponse
 */
export interface AddTransactionsResponse {}
/**
 * *
 * Same message as AddTransactionsRequest, except that transactions are encoded in a byte string
 *
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ImportTopologySnapshotRequest
 */
export interface ImportTopologySnapshotRequest {
    /**
     * @generated from protobuf field: bytes topology_snapshot = 1
     */
    topologySnapshot: Uint8Array
    /**
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId store = 2
     */
    store?: StoreId
    /**
     * * Optional timeout to wait for the transaction to become effective in the store.
     *
     * @generated from protobuf field: google.protobuf.Duration wait_to_become_effective = 3
     */
    waitToBecomeEffective?: Duration
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.ImportTopologySnapshotResponse
 */
export interface ImportTopologySnapshotResponse {}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.SignTransactionsRequest
 */
export interface SignTransactionsRequest {
    /**
     * * The transactions to be signed, but will not be stored in the authorized store
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.SignedTopologyTransaction transactions = 1
     */
    transactions: SignedTopologyTransaction[]
    /**
     * *
     * Fingerprint of the keys signing the authorization
     *
     * The signing key is used to identify a particular `NamespaceDelegation` certificate,
     * which is used to justify the given authorization.
     * Optional, if empty, suitable signing keys available known to the node are automatically selected.
     *
     * @generated from protobuf field: repeated string signed_by = 2
     */
    signedBy: string[]
    /**
     * Target store
     *
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId store = 3
     */
    store?: StoreId
    /**
     * * Force specific changes even if dangerous
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.topology.admin.v30.ForceFlag force_flags = 4
     */
    forceFlags: ForceFlag[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.SignTransactionsResponse
 */
export interface SignTransactionsResponse {
    /**
     * * The transactions with the additional signatures from this node.
     *
     * @generated from protobuf field: repeated com.digitalasset.canton.protocol.v30.SignedTopologyTransaction transactions = 1
     */
    transactions: SignedTopologyTransaction[]
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.CreateTemporaryTopologyStoreRequest
 */
export interface CreateTemporaryTopologyStoreRequest {
    /**
     * * The name of the topology store
     *
     * @generated from protobuf field: string name = 1
     */
    name: string
    /**
     * * The protocol version that should be used by the store
     *
     * @generated from protobuf field: uint32 protocol_version = 2
     */
    protocolVersion: number
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.CreateTemporaryTopologyStoreResponse
 */
export interface CreateTemporaryTopologyStoreResponse {
    /**
     * * The identifier of the topology store that should be used as a store filter string
     *
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId.Temporary store_id = 1
     */
    storeId?: StoreId_Temporary
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.DropTemporaryTopologyStoreRequest
 */
export interface DropTemporaryTopologyStoreRequest {
    /**
     * * The identifier of the topology store that should be dropped
     *
     * @generated from protobuf field: com.digitalasset.canton.topology.admin.v30.StoreId.Temporary store_id = 1
     */
    storeId?: StoreId_Temporary
}
/**
 * @generated from protobuf message com.digitalasset.canton.topology.admin.v30.DropTemporaryTopologyStoreResponse
 */
export interface DropTemporaryTopologyStoreResponse {}
/**
 * @generated from protobuf enum com.digitalasset.canton.topology.admin.v30.ForceFlag
 */
export declare enum ForceFlag {
    /**
     * @generated from protobuf enum value: FORCE_FLAG_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * * Required when authorizing adding a topology transaction on behalf of another node.
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALIEN_MEMBER = 1;
     */
    ALIEN_MEMBER = 1,
    /**
     * Deprecated, increasing ledger time record time tolerance does not require a force flag for PV >= 32
     *
     * @generated from protobuf enum value: FORCE_FLAG_LEDGER_TIME_RECORD_TIME_TOLERANCE_INCREASE = 2;
     */
    LEDGER_TIME_RECORD_TIME_TOLERANCE_INCREASE = 2,
    /**
     * * Required when revoking the vetting of a package
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALLOW_UNVET_PACKAGE = 3;
     */
    ALLOW_UNVET_PACKAGE = 3,
    /**
     * * Required when vetting unknown packages (not uploaded).
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALLOW_UNKNOWN_PACKAGE = 4;
     */
    ALLOW_UNKNOWN_PACKAGE = 4,
    /**
     * * Required when vetting a package with unvetted dependencies
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALLOW_UNVETTED_DEPENDENCIES = 5;
     */
    ALLOW_UNVETTED_DEPENDENCIES = 5,
    /**
     * * Required when disabling a party with active contracts
     *
     * @generated from protobuf enum value: FORCE_FLAG_DISABLE_PARTY_WITH_ACTIVE_CONTRACTS = 6;
     */
    DISABLE_PARTY_WITH_ACTIVE_CONTRACTS = 6,
    /**
     * *
     * Required when using a key that is not suitable to sign a topology transaction.
     * Using this force flag likely causes the transaction to be rejected at a later stage of the processing.
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALLOW_UNVALIDATED_SIGNING_KEYS = 7;
     */
    ALLOW_UNVALIDATED_SIGNING_KEYS = 7,
    /**
     * * Required when unvetting a package with active contracts
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALLOW_UNVET_PACKAGE_WITH_ACTIVE_CONTRACTS = 8;
     */
    ALLOW_UNVET_PACKAGE_WITH_ACTIVE_CONTRACTS = 8,
    /**
     * * Required when increasing the submission time record time tolerance
     *
     * @generated from protobuf enum value: FORCE_FLAG_PREPARATION_TIME_RECORD_TIME_TOLERANCE_INCREASE = 9;
     */
    PREPARATION_TIME_RECORD_TIME_TOLERANCE_INCREASE = 9,
    /**
     * * Required when we want to change all participants' permissions to observation while the party is still a signatory of a contract.
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALLOW_INSUFFICIENT_PARTICIPANT_PERMISSION_FOR_SIGNATORY_PARTY = 10;
     */
    ALLOW_INSUFFICIENT_PARTICIPANT_PERMISSION_FOR_SIGNATORY_PARTY = 10,
    /**
     * * Required when changing the party-to-participant mapping, that would result in insufficient
     * signatory-assigning participants and thus the assignment would be stuck.
     *
     * @generated from protobuf enum value: FORCE_FLAG_ALLOW_INSUFFICIENT_SIGNATORY_ASSIGNING_PARTICIPANTS_FOR_PARTY = 11;
     */
    ALLOW_INSUFFICIENT_SIGNATORY_ASSIGNING_PARTICIPANTS_FOR_PARTY = 11,
}
declare class GenerateTransactionsRequest$Type extends MessageType<GenerateTransactionsRequest> {
    constructor()
    create(
        value?: PartialMessage<GenerateTransactionsRequest>
    ): GenerateTransactionsRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: GenerateTransactionsRequest
    ): GenerateTransactionsRequest
    internalBinaryWrite(
        message: GenerateTransactionsRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsRequest
 */
export declare const GenerateTransactionsRequest: GenerateTransactionsRequest$Type
declare class GenerateTransactionsRequest_Proposal$Type extends MessageType<GenerateTransactionsRequest_Proposal> {
    constructor()
    create(
        value?: PartialMessage<GenerateTransactionsRequest_Proposal>
    ): GenerateTransactionsRequest_Proposal
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: GenerateTransactionsRequest_Proposal
    ): GenerateTransactionsRequest_Proposal
    internalBinaryWrite(
        message: GenerateTransactionsRequest_Proposal,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsRequest.Proposal
 */
export declare const GenerateTransactionsRequest_Proposal: GenerateTransactionsRequest_Proposal$Type
declare class GenerateTransactionsResponse$Type extends MessageType<GenerateTransactionsResponse> {
    constructor()
    create(
        value?: PartialMessage<GenerateTransactionsResponse>
    ): GenerateTransactionsResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: GenerateTransactionsResponse
    ): GenerateTransactionsResponse
    internalBinaryWrite(
        message: GenerateTransactionsResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsResponse
 */
export declare const GenerateTransactionsResponse: GenerateTransactionsResponse$Type
declare class GenerateTransactionsResponse_GeneratedTransaction$Type extends MessageType<GenerateTransactionsResponse_GeneratedTransaction> {
    constructor()
    create(
        value?: PartialMessage<GenerateTransactionsResponse_GeneratedTransaction>
    ): GenerateTransactionsResponse_GeneratedTransaction
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: GenerateTransactionsResponse_GeneratedTransaction
    ): GenerateTransactionsResponse_GeneratedTransaction
    internalBinaryWrite(
        message: GenerateTransactionsResponse_GeneratedTransaction,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.GenerateTransactionsResponse.GeneratedTransaction
 */
export declare const GenerateTransactionsResponse_GeneratedTransaction: GenerateTransactionsResponse_GeneratedTransaction$Type
declare class AuthorizeRequest$Type extends MessageType<AuthorizeRequest> {
    constructor()
    create(value?: PartialMessage<AuthorizeRequest>): AuthorizeRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: AuthorizeRequest
    ): AuthorizeRequest
    internalBinaryWrite(
        message: AuthorizeRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.AuthorizeRequest
 */
export declare const AuthorizeRequest: AuthorizeRequest$Type
declare class AuthorizeRequest_Proposal$Type extends MessageType<AuthorizeRequest_Proposal> {
    constructor()
    create(
        value?: PartialMessage<AuthorizeRequest_Proposal>
    ): AuthorizeRequest_Proposal
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: AuthorizeRequest_Proposal
    ): AuthorizeRequest_Proposal
    internalBinaryWrite(
        message: AuthorizeRequest_Proposal,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.AuthorizeRequest.Proposal
 */
export declare const AuthorizeRequest_Proposal: AuthorizeRequest_Proposal$Type
declare class AuthorizeResponse$Type extends MessageType<AuthorizeResponse> {
    constructor()
    create(value?: PartialMessage<AuthorizeResponse>): AuthorizeResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: AuthorizeResponse
    ): AuthorizeResponse
    internalBinaryWrite(
        message: AuthorizeResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.AuthorizeResponse
 */
export declare const AuthorizeResponse: AuthorizeResponse$Type
declare class AddTransactionsRequest$Type extends MessageType<AddTransactionsRequest> {
    constructor()
    create(
        value?: PartialMessage<AddTransactionsRequest>
    ): AddTransactionsRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: AddTransactionsRequest
    ): AddTransactionsRequest
    internalBinaryWrite(
        message: AddTransactionsRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.AddTransactionsRequest
 */
export declare const AddTransactionsRequest: AddTransactionsRequest$Type
declare class AddTransactionsResponse$Type extends MessageType<AddTransactionsResponse> {
    constructor()
    create(
        value?: PartialMessage<AddTransactionsResponse>
    ): AddTransactionsResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: AddTransactionsResponse
    ): AddTransactionsResponse
    internalBinaryWrite(
        message: AddTransactionsResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.AddTransactionsResponse
 */
export declare const AddTransactionsResponse: AddTransactionsResponse$Type
declare class ImportTopologySnapshotRequest$Type extends MessageType<ImportTopologySnapshotRequest> {
    constructor()
    create(
        value?: PartialMessage<ImportTopologySnapshotRequest>
    ): ImportTopologySnapshotRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ImportTopologySnapshotRequest
    ): ImportTopologySnapshotRequest
    internalBinaryWrite(
        message: ImportTopologySnapshotRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ImportTopologySnapshotRequest
 */
export declare const ImportTopologySnapshotRequest: ImportTopologySnapshotRequest$Type
declare class ImportTopologySnapshotResponse$Type extends MessageType<ImportTopologySnapshotResponse> {
    constructor()
    create(
        value?: PartialMessage<ImportTopologySnapshotResponse>
    ): ImportTopologySnapshotResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: ImportTopologySnapshotResponse
    ): ImportTopologySnapshotResponse
    internalBinaryWrite(
        message: ImportTopologySnapshotResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.ImportTopologySnapshotResponse
 */
export declare const ImportTopologySnapshotResponse: ImportTopologySnapshotResponse$Type
declare class SignTransactionsRequest$Type extends MessageType<SignTransactionsRequest> {
    constructor()
    create(
        value?: PartialMessage<SignTransactionsRequest>
    ): SignTransactionsRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SignTransactionsRequest
    ): SignTransactionsRequest
    internalBinaryWrite(
        message: SignTransactionsRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.SignTransactionsRequest
 */
export declare const SignTransactionsRequest: SignTransactionsRequest$Type
declare class SignTransactionsResponse$Type extends MessageType<SignTransactionsResponse> {
    constructor()
    create(
        value?: PartialMessage<SignTransactionsResponse>
    ): SignTransactionsResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: SignTransactionsResponse
    ): SignTransactionsResponse
    internalBinaryWrite(
        message: SignTransactionsResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.SignTransactionsResponse
 */
export declare const SignTransactionsResponse: SignTransactionsResponse$Type
declare class CreateTemporaryTopologyStoreRequest$Type extends MessageType<CreateTemporaryTopologyStoreRequest> {
    constructor()
    create(
        value?: PartialMessage<CreateTemporaryTopologyStoreRequest>
    ): CreateTemporaryTopologyStoreRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: CreateTemporaryTopologyStoreRequest
    ): CreateTemporaryTopologyStoreRequest
    internalBinaryWrite(
        message: CreateTemporaryTopologyStoreRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.CreateTemporaryTopologyStoreRequest
 */
export declare const CreateTemporaryTopologyStoreRequest: CreateTemporaryTopologyStoreRequest$Type
declare class CreateTemporaryTopologyStoreResponse$Type extends MessageType<CreateTemporaryTopologyStoreResponse> {
    constructor()
    create(
        value?: PartialMessage<CreateTemporaryTopologyStoreResponse>
    ): CreateTemporaryTopologyStoreResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: CreateTemporaryTopologyStoreResponse
    ): CreateTemporaryTopologyStoreResponse
    internalBinaryWrite(
        message: CreateTemporaryTopologyStoreResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.CreateTemporaryTopologyStoreResponse
 */
export declare const CreateTemporaryTopologyStoreResponse: CreateTemporaryTopologyStoreResponse$Type
declare class DropTemporaryTopologyStoreRequest$Type extends MessageType<DropTemporaryTopologyStoreRequest> {
    constructor()
    create(
        value?: PartialMessage<DropTemporaryTopologyStoreRequest>
    ): DropTemporaryTopologyStoreRequest
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: DropTemporaryTopologyStoreRequest
    ): DropTemporaryTopologyStoreRequest
    internalBinaryWrite(
        message: DropTemporaryTopologyStoreRequest,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.DropTemporaryTopologyStoreRequest
 */
export declare const DropTemporaryTopologyStoreRequest: DropTemporaryTopologyStoreRequest$Type
declare class DropTemporaryTopologyStoreResponse$Type extends MessageType<DropTemporaryTopologyStoreResponse> {
    constructor()
    create(
        value?: PartialMessage<DropTemporaryTopologyStoreResponse>
    ): DropTemporaryTopologyStoreResponse
    internalBinaryRead(
        reader: IBinaryReader,
        length: number,
        options: BinaryReadOptions,
        target?: DropTemporaryTopologyStoreResponse
    ): DropTemporaryTopologyStoreResponse
    internalBinaryWrite(
        message: DropTemporaryTopologyStoreResponse,
        writer: IBinaryWriter,
        options: BinaryWriteOptions
    ): IBinaryWriter
}
/**
 * @generated MessageType for protobuf message com.digitalasset.canton.topology.admin.v30.DropTemporaryTopologyStoreResponse
 */
export declare const DropTemporaryTopologyStoreResponse: DropTemporaryTopologyStoreResponse$Type
/**
 * @generated ServiceType for protobuf service com.digitalasset.canton.topology.admin.v30.TopologyManagerWriteService
 */
export declare const TopologyManagerWriteService: ServiceType
export {}
//# sourceMappingURL=topology_manager_write_service.d.ts.map
