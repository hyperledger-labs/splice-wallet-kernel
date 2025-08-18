import { TopologyManagerWriteService } from './topology_manager_write_service.js'
import { stackIntercept } from '@protobuf-ts/runtime-rpc'
/**
 * *
 * Write operations on the local topology manager.
 *
 * Participants, mediators, and sequencers run a local topology manager exposing the same write interface.
 *
 * @generated from protobuf service com.digitalasset.canton.topology.admin.v30.TopologyManagerWriteService
 */
export class TopologyManagerWriteServiceClient {
    _transport
    typeName = TopologyManagerWriteService.typeName
    methods = TopologyManagerWriteService.methods
    options = TopologyManagerWriteService.options
    constructor(_transport) {
        this._transport = _transport
    }
    /**
     * @generated from protobuf rpc: Authorize
     */
    authorize(input, options) {
        const method = this.methods[0],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: AddTransactions
     */
    addTransactions(input, options) {
        const method = this.methods[1],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ImportTopologySnapshot
     */
    importTopologySnapshot(options) {
        const method = this.methods[2],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('clientStreaming', this._transport, method, opt)
    }
    /**
     * @generated from protobuf rpc: SignTransactions
     */
    signTransactions(input, options) {
        const method = this.methods[3],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * * RPC to generate topology transactions that can be signed
     *
     * @generated from protobuf rpc: GenerateTransactions
     */
    generateTransactions(input, options) {
        const method = this.methods[4],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * * Creates a temporary topology store.
     * Trying to create a store with the same name results in an error.
     *
     * @generated from protobuf rpc: CreateTemporaryTopologyStore
     */
    createTemporaryTopologyStore(input, options) {
        const method = this.methods[5],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * * Drops a temporary topology store.
     * Trying to drop a temporary store that does not exist results in an error.
     *
     * @generated from protobuf rpc: DropTemporaryTopologyStore
     */
    dropTemporaryTopologyStore(input, options) {
        const method = this.methods[6],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
}
