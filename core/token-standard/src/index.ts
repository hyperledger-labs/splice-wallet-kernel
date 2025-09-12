export * from './token-standard-client.js'

export { TransferInstructionView } from './token-standard-models-1.0.0/lib/Splice/Api/Token/TransferInstructionV1'

// Codegen outputs are treated as separate package
// this gets around issues with relative paths imports in dist
// That arisen because of daml codegen outputting only .js and .d.ts files

// Constants
export * from './interface-ids.const.js'

export type HoldingView = {
    owner: string
    instrumentId: InstrumentId
    amount: number
    lock: any
    meta: Metadata
}

type InstrumentId = {
    admin: string
    id: string
}

type Metadata = {
    values: { [key: string]: string }
}
