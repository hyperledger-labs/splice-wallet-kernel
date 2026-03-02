// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    PreparedTransaction,
    TopologyTransaction,
} from '@canton-network/core-ledger-proto'
import { computePreparedTransaction } from './hashing_scheme_v2.js'
import { fromBase64, toBase64, toHex } from './utils.js'
export {
    computeSha256CantonHash,
    computeMultiHashForTopology,
} from './hashing_scheme_v2.js'

/**
 * Decodes a base64 encoded prepared transaction into a well-typed data model, generated directly from Protobuf definitions.
 *
 * @param preparedTransaction - The prepared transaction in base64 format
 * @returns The decoded prepared transaction
 */
export const decodePreparedTransaction = (
    preparedTransaction: string
): PreparedTransaction => {
    const bytes = fromBase64(preparedTransaction)
    return PreparedTransaction.fromBinary(bytes)
}

export const decodeTopologyTransaction = (
    topologyTx: string
): TopologyTransaction => {
    const bytes = fromBase64(topologyTx)
    return TopologyTransaction.fromBinary(bytes)
}

/**
 * Computes the hash of a prepared transaction.
 *
 * @param preparedTransaction - The prepared transaction to hash
 * @param format - The format of the output hash (base64 or hex)
 * @returns The computed hash in the specified format
 */
export const hashPreparedTransaction = async (
    preparedTransaction: string | PreparedTransaction,
    format: 'base64' | 'hex' = 'base64'
): Promise<string> => {
    let preparedTx: PreparedTransaction

    if (typeof preparedTransaction === 'string') {
        preparedTx = decodePreparedTransaction(preparedTransaction)
    } else {
        preparedTx = preparedTransaction
    }

    const hash = await computePreparedTransaction(preparedTx)

    switch (format) {
        case 'base64':
            return toBase64(hash)
        case 'hex':
            return toHex(hash)
    }
}

type ValidationResult = Record<
    string,
    {
        isAuthorized: boolean
        locations: string[]
    }
>

export const validateAuthorizedPartyIds = (
    preparedTransaction: string | PreparedTransaction,
    authorizedPartyIds: string[]
): ValidationResult => {
    let preparedTx: PreparedTransaction

    if (typeof preparedTransaction === 'string') {
        preparedTx = decodePreparedTransaction(preparedTransaction)
    } else {
        preparedTx = preparedTransaction
    }

    const results: ValidationResult = {}
    preparedTx.metadata?.submitterInfo?.actAs.forEach((party) => {
        results[party] = {
            isAuthorized: authorizedPartyIds.includes(party),
            locations: [
                ...results[party].locations,
                'metadata.submitterInfo.actAs',
            ],
        }
    })

    // then check transaction nodes
    preparedTx.transaction?.nodes.forEach((node) => {
        if (node.versionedNode.oneofKind === 'v1') {
            if (node.versionedNode.v1.nodeType.oneofKind === 'create') {
                node.versionedNode.v1.nodeType.create.signatories.forEach(
                    (party) => {
                        results[party] = {
                            isAuthorized: authorizedPartyIds.includes(party),
                            locations: [
                                ...results[party].locations,
                                `transaction.nodes.${node.nodeId}.create.signatories`,
                            ],
                        }
                    }
                )

                node.versionedNode.v1.nodeType.create.stakeholders.forEach(
                    (party) => {
                        results[party] = {
                            isAuthorized: authorizedPartyIds.includes(party),
                            locations: [
                                ...results[party].locations,
                                `transaction.nodes.${node.nodeId}.create.stakeholders`,
                            ],
                        }
                    }
                )
            }

            if (node.versionedNode.v1.nodeType.oneofKind === 'exercise') {
                throw new Error('Unsupported')
            }

            if (node.versionedNode.v1.nodeType.oneofKind === 'fetch') {
                throw new Error('Unsupported')
            }

            if (node.versionedNode.v1.nodeType.oneofKind === 'rollback') {
                // do we need to check these nodes?
            }
        }
    })

    return results
}

/** Parsed transaction metadata to JSON for display purposes */
export interface ParsedTransactionInfo {
    packageName?: string
    moduleName?: string
    entityName?: string
    isCreate: boolean
    isExercise: boolean
    signatories?: string[]
    stakeholders?: string[]
    jsonString?: string
    //defined as packageName:ModuleName:EntityName
    templateId?: string
}

function decodePreparedTransactionToJsonString(txBase64: string): string {
    const t = decodePreparedTransaction(txBase64)
    return JSON.stringify(
        t,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
    )
}

export function parsePreparedTransaction(
    txBase64: string
): ParsedTransactionInfo {
    const jsonString = decodePreparedTransactionToJsonString(txBase64)
    const obj = JSON.parse(jsonString)

    const result: ParsedTransactionInfo = {
        jsonString,
        isCreate: false,
        isExercise: false,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function deepSearch(value: any) {
        if (value === null || typeof value !== 'object') return

        // Extract fields if present
        if (typeof value.packageName === 'string') {
            result.packageName = value.packageName
        }
        if (Array.isArray(value.signatories)) {
            result.signatories = value.signatories
        }
        if (Array.isArray(value.stakeholders)) {
            result.stakeholders = value.stakeholders
        }
        if (value.templateId?.moduleName) {
            result.moduleName = value.templateId.moduleName
        }
        if (value.templateId?.entityName) {
            result.entityName = value.templateId.entityName
        }
        if (value.nodeType?.create) {
            result.isCreate = true
        }
        if (value.nodeType?.exercise) {
            result.isExercise = true
        }
        // Continue walking the object
        for (const key of Object.keys(value)) {
            deepSearch(value[key])
        }
    }

    deepSearch(obj)
    result.templateId = `${result.packageName || 'N/A'}:${result.moduleName || 'N/A'}:${result.entityName || 'N/A'}` // Ensure this is always set to the defined value
    return result
}
