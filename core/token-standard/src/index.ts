export * from './token-standard-client.js'

// Codegen outputs are treated as separate package
// this gets around issues with relative paths imports in dist
// That arisen because of daml codegen outputting only .js and .d.ts files

// Constants
export * from './interface-ids.const.js'

// Types have to be exported directly from the source file
export type {
    AllocationInstructionV1,
    AllocationRequestV1,
    AllocationV1,
    HoldingV1,
    MetadataV1,
    TransferInstructionV1,
} from './token-standard-models-1.0.0/lib/Splice/Api/Token/index.js'
