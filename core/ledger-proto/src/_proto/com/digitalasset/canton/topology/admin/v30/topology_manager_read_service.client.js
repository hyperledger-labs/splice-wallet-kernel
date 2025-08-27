import { TopologyManagerReadService } from './topology_manager_read_service.js'
import { stackIntercept } from '@protobuf-ts/runtime-rpc'
/**
 * @generated from protobuf service com.digitalasset.canton.topology.admin.v30.TopologyManagerReadService
 */
export class TopologyManagerReadServiceClient {
    _transport
    typeName = TopologyManagerReadService.typeName
    methods = TopologyManagerReadService.methods
    options = TopologyManagerReadService.options
    constructor(_transport) {
        this._transport = _transport
    }
    /**
     * @generated from protobuf rpc: ListNamespaceDelegation
     */
    listNamespaceDelegation(input, options) {
        const method = this.methods[0],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListDecentralizedNamespaceDefinition
     */
    listDecentralizedNamespaceDefinition(input, options) {
        const method = this.methods[1],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListOwnerToKeyMapping
     */
    listOwnerToKeyMapping(input, options) {
        const method = this.methods[2],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListPartyToKeyMapping
     */
    listPartyToKeyMapping(input, options) {
        const method = this.methods[3],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListSynchronizerTrustCertificate
     */
    listSynchronizerTrustCertificate(input, options) {
        const method = this.methods[4],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListParticipantSynchronizerPermission
     */
    listParticipantSynchronizerPermission(input, options) {
        const method = this.methods[5],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListPartyHostingLimits
     */
    listPartyHostingLimits(input, options) {
        const method = this.methods[6],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListVettedPackages
     */
    listVettedPackages(input, options) {
        const method = this.methods[7],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListPartyToParticipant
     */
    listPartyToParticipant(input, options) {
        const method = this.methods[8],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListSynchronizerParametersState
     */
    listSynchronizerParametersState(input, options) {
        const method = this.methods[9],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListMediatorSynchronizerState
     */
    listMediatorSynchronizerState(input, options) {
        const method = this.methods[10],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListSequencerSynchronizerState
     */
    listSequencerSynchronizerState(input, options) {
        const method = this.methods[11],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListPurgeTopologyTransaction
     */
    listPurgeTopologyTransaction(input, options) {
        const method = this.methods[12],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListSynchronizerUpgradeAnnouncement
     */
    listSynchronizerUpgradeAnnouncement(input, options) {
        const method = this.methods[13],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListSequencerConnectionSuccessor
     */
    listSequencerConnectionSuccessor(input, options) {
        const method = this.methods[14],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListAvailableStores
     */
    listAvailableStores(input, options) {
        const method = this.methods[15],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ListAll
     */
    listAll(input, options) {
        const method = this.methods[16],
            opt = this._transport.mergeOptions(options)
        return stackIntercept('unary', this._transport, method, opt, input)
    }
    /**
     * @generated from protobuf rpc: ExportTopologySnapshot
     */
    exportTopologySnapshot(input, options) {
        const method = this.methods[17],
            opt = this._transport.mergeOptions(options)
        return stackIntercept(
            'serverStreaming',
            this._transport,
            method,
            opt,
            input
        )
    }
    /**
     * Fetch the genesis topology state.
     * The returned bytestring can be used directly to initialize a sequencer.
     *
     * @generated from protobuf rpc: GenesisState
     */
    genesisState(input, options) {
        const method = this.methods[18],
            opt = this._transport.mergeOptions(options)
        return stackIntercept(
            'serverStreaming',
            this._transport,
            method,
            opt,
            input
        )
    }
}
