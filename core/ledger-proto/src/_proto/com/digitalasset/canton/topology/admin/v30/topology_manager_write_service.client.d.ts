import type { RpcTransport } from '@protobuf-ts/runtime-rpc'
import type { ServiceInfo } from '@protobuf-ts/runtime-rpc'
import type { DropTemporaryTopologyStoreResponse } from './topology_manager_write_service.js'
import type { DropTemporaryTopologyStoreRequest } from './topology_manager_write_service.js'
import type { CreateTemporaryTopologyStoreResponse } from './topology_manager_write_service.js'
import type { CreateTemporaryTopologyStoreRequest } from './topology_manager_write_service.js'
import type { GenerateTransactionsResponse } from './topology_manager_write_service.js'
import type { GenerateTransactionsRequest } from './topology_manager_write_service.js'
import type { SignTransactionsResponse } from './topology_manager_write_service.js'
import type { SignTransactionsRequest } from './topology_manager_write_service.js'
import type { ImportTopologySnapshotResponse } from './topology_manager_write_service.js'
import type { ImportTopologySnapshotRequest } from './topology_manager_write_service.js'
import type { ClientStreamingCall } from '@protobuf-ts/runtime-rpc'
import type { AddTransactionsResponse } from './topology_manager_write_service.js'
import type { AddTransactionsRequest } from './topology_manager_write_service.js'
import type { AuthorizeResponse } from './topology_manager_write_service.js'
import type { AuthorizeRequest } from './topology_manager_write_service.js'
import type { UnaryCall } from '@protobuf-ts/runtime-rpc'
import type { RpcOptions } from '@protobuf-ts/runtime-rpc'
/**
 * *
 * Write operations on the local topology manager.
 *
 * Participants, mediators, and sequencers run a local topology manager exposing the same write interface.
 *
 * @generated from protobuf service com.digitalasset.canton.topology.admin.v30.TopologyManagerWriteService
 */
export interface ITopologyManagerWriteServiceClient {
    /**
     * @generated from protobuf rpc: Authorize
     */
    authorize(
        input: AuthorizeRequest,
        options?: RpcOptions
    ): UnaryCall<AuthorizeRequest, AuthorizeResponse>
    /**
     * @generated from protobuf rpc: AddTransactions
     */
    addTransactions(
        input: AddTransactionsRequest,
        options?: RpcOptions
    ): UnaryCall<AddTransactionsRequest, AddTransactionsResponse>
    /**
     * @generated from protobuf rpc: ImportTopologySnapshot
     */
    importTopologySnapshot(
        options?: RpcOptions
    ): ClientStreamingCall<
        ImportTopologySnapshotRequest,
        ImportTopologySnapshotResponse
    >
    /**
     * @generated from protobuf rpc: SignTransactions
     */
    signTransactions(
        input: SignTransactionsRequest,
        options?: RpcOptions
    ): UnaryCall<SignTransactionsRequest, SignTransactionsResponse>
    /**
     * * RPC to generate topology transactions that can be signed
     *
     * @generated from protobuf rpc: GenerateTransactions
     */
    generateTransactions(
        input: GenerateTransactionsRequest,
        options?: RpcOptions
    ): UnaryCall<GenerateTransactionsRequest, GenerateTransactionsResponse>
    /**
     * * Creates a temporary topology store.
     * Trying to create a store with the same name results in an error.
     *
     * @generated from protobuf rpc: CreateTemporaryTopologyStore
     */
    createTemporaryTopologyStore(
        input: CreateTemporaryTopologyStoreRequest,
        options?: RpcOptions
    ): UnaryCall<
        CreateTemporaryTopologyStoreRequest,
        CreateTemporaryTopologyStoreResponse
    >
    /**
     * * Drops a temporary topology store.
     * Trying to drop a temporary store that does not exist results in an error.
     *
     * @generated from protobuf rpc: DropTemporaryTopologyStore
     */
    dropTemporaryTopologyStore(
        input: DropTemporaryTopologyStoreRequest,
        options?: RpcOptions
    ): UnaryCall<
        DropTemporaryTopologyStoreRequest,
        DropTemporaryTopologyStoreResponse
    >
}
/**
 * *
 * Write operations on the local topology manager.
 *
 * Participants, mediators, and sequencers run a local topology manager exposing the same write interface.
 *
 * @generated from protobuf service com.digitalasset.canton.topology.admin.v30.TopologyManagerWriteService
 */
export declare class TopologyManagerWriteServiceClient
    implements ITopologyManagerWriteServiceClient, ServiceInfo
{
    private readonly _transport
    typeName: string
    methods: import('@protobuf-ts/runtime-rpc').MethodInfo<any, any>[]
    options: {
        [extensionName: string]: import('@protobuf-ts/runtime').JsonValue
    }
    constructor(_transport: RpcTransport)
    /**
     * @generated from protobuf rpc: Authorize
     */
    authorize(
        input: AuthorizeRequest,
        options?: RpcOptions
    ): UnaryCall<AuthorizeRequest, AuthorizeResponse>
    /**
     * @generated from protobuf rpc: AddTransactions
     */
    addTransactions(
        input: AddTransactionsRequest,
        options?: RpcOptions
    ): UnaryCall<AddTransactionsRequest, AddTransactionsResponse>
    /**
     * @generated from protobuf rpc: ImportTopologySnapshot
     */
    importTopologySnapshot(
        options?: RpcOptions
    ): ClientStreamingCall<
        ImportTopologySnapshotRequest,
        ImportTopologySnapshotResponse
    >
    /**
     * @generated from protobuf rpc: SignTransactions
     */
    signTransactions(
        input: SignTransactionsRequest,
        options?: RpcOptions
    ): UnaryCall<SignTransactionsRequest, SignTransactionsResponse>
    /**
     * * RPC to generate topology transactions that can be signed
     *
     * @generated from protobuf rpc: GenerateTransactions
     */
    generateTransactions(
        input: GenerateTransactionsRequest,
        options?: RpcOptions
    ): UnaryCall<GenerateTransactionsRequest, GenerateTransactionsResponse>
    /**
     * * Creates a temporary topology store.
     * Trying to create a store with the same name results in an error.
     *
     * @generated from protobuf rpc: CreateTemporaryTopologyStore
     */
    createTemporaryTopologyStore(
        input: CreateTemporaryTopologyStoreRequest,
        options?: RpcOptions
    ): UnaryCall<
        CreateTemporaryTopologyStoreRequest,
        CreateTemporaryTopologyStoreResponse
    >
    /**
     * * Drops a temporary topology store.
     * Trying to drop a temporary store that does not exist results in an error.
     *
     * @generated from protobuf rpc: DropTemporaryTopologyStore
     */
    dropTemporaryTopologyStore(
        input: DropTemporaryTopologyStoreRequest,
        options?: RpcOptions
    ): UnaryCall<
        DropTemporaryTopologyStoreRequest,
        DropTemporaryTopologyStoreResponse
    >
}
//# sourceMappingURL=topology_manager_write_service.client.d.ts.map
