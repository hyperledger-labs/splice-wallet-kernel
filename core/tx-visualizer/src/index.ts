// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    PreparedTransaction,
    TopologyTransaction,
    decodeUnknownFields,
} from '@canton-network/core-ledger-proto'
import { computePreparedTransaction } from './hashing_scheme_v2.js'
import { fromBase64, toBase64, toHex } from './utils.js'
export {
    computeSha256CantonHash,
    computeMultiHashForTopology,
} from './hashing_scheme_v2.js'
export {
    decodeUnknownFields,
    type RawFields,
    type RawValue,
} from '@canton-network/core-ledger-proto'

/* oxlint-disable typescript/no-explicit-any */

/**
 * Options for decoding protobuf encoded transactions.
 */
export interface DecodeOptions {
    /**
     * Shall unknown fields be read, ignored or raise an error?
     *
     * `true`: keeps the unknown field on the message, readable via
     * `decodeUnknownFields`. This is the default behaviour.
     *
     * `false`: ignores the unknown field.
     *
     * `"throw"`: throws an error.
     */
    readUnknownField?: boolean | 'throw'
}

const toReadOptions = (options?: DecodeOptions) =>
    options?.readUnknownField === undefined
        ? undefined
        : { readUnknownField: options.readUnknownField }

/**
 * Decodes a base64 encoded prepared transaction into a well-typed data model, generated directly from Protobuf definitions.
 *
 * @param preparedTransaction - The prepared transaction in base64 format
 * @param options - Decode options, e.g. `{ readUnknownField: 'throw' }` to reject unknown fields
 * @returns The decoded prepared transaction
 */
export const decodePreparedTransaction = (
    preparedTransaction: string,
    options?: DecodeOptions
): PreparedTransaction => {
    const bytes = fromBase64(preparedTransaction)
    return PreparedTransaction.fromBinary(bytes, toReadOptions(options))
}

/**
 * Decodes a base64 encoded topology transaction into a well-typed data model, generated directly from Protobuf definitions.
 *
 * @param topologyTx - The topology transaction in base64 format
 * @param options - Decode options, e.g. `{ readUnknownField: 'throw' }` to reject unknown fields
 * @returns The decoded topology transaction
 */
export const decodeTopologyTransaction = (
    topologyTx: string,
    options?: DecodeOptions
): TopologyTransaction => {
    const bytes = fromBase64(topologyTx)
    return TopologyTransaction.fromBinary(bytes, toReadOptions(options))
}

/**
 * Computes the hash of a prepared transaction.
 *
 * @param preparedTransaction - The prepared transaction to hash
 * @param format - The format of the output hash (base64 or hex)
 * @param options - Decode options, used when `preparedTransaction` is a base64 string
 * @returns The computed hash in the specified format
 */
export const hashPreparedTransaction = async (
    preparedTransaction: string | PreparedTransaction,
    format: 'base64' | 'hex' = 'base64',
    options?: DecodeOptions
): Promise<string> => {
    let preparedTx: PreparedTransaction

    if (typeof preparedTransaction === 'string') {
        preparedTx = decodePreparedTransaction(preparedTransaction, options)
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
    authorizedPartyIds: string[],
    options?: DecodeOptions
): ValidationResult => {
    let preparedTx: PreparedTransaction

    if (typeof preparedTransaction === 'string') {
        preparedTx = decodePreparedTransaction(preparedTransaction, options)
    } else {
        preparedTx = preparedTransaction
    }

    const results: ValidationResult = {}
    const updateParty = (party: string, location: string) => {
        if (!results[party]) {
            results[party] = {
                isAuthorized: authorizedPartyIds.includes(party),
                locations: [],
            }
        }

        results[party].locations.push(location)
    }

    preparedTx.metadata?.submitterInfo?.actAs.forEach((party) => {
        updateParty(party, 'metadata.submitterInfo.actAs')
    })

    // then check transaction nodes
    preparedTx.transaction?.nodes.forEach((node) => {
        if (node.versionedNode.oneofKind === 'v1') {
            if (node.versionedNode.v1.nodeType.oneofKind === 'create') {
                node.versionedNode.v1.nodeType.create.signatories.forEach(
                    (party) => {
                        updateParty(
                            party,
                            `transaction.nodes.${node.nodeId}.create.signatories`
                        )
                    }
                )

                node.versionedNode.v1.nodeType.create.stakeholders.forEach(
                    (party) => {
                        updateParty(
                            party,
                            `transaction.nodes.${node.nodeId}.create.stakeholders`
                        )
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
    choiceId?: string
    amount?: string
}

// JSON.stringify drops symbol keys, so expose unknown fields under a regular key
function toJsonValue(_key: string, value: unknown): unknown {
    if (typeof value === 'bigint') {
        return value.toString()
    }

    if (value !== null && typeof value === 'object') {
        const unknownFields = decodeUnknownFields(value)
        if (unknownFields) {
            return { ...value, unknownFields }
        }
    }

    return value
}

function decodePreparedTransactionToJsonString(
    txBase64: string,
    options?: DecodeOptions
): string {
    const t = decodePreparedTransaction(txBase64, options)
    return JSON.stringify(t, toJsonValue, 2)
}

function getNodeType(node: any) {
    if (node?.versionedNode?.oneofKind !== 'v1') {
        return null
    }

    return node.versionedNode.v1?.nodeType ?? null
}

function findNodeById(nodes: any[], nodeId: string | undefined) {
    if (!nodeId) {
        return null
    }

    return nodes.find((node) => node?.nodeId === nodeId) ?? null
}

function getPrimaryNode(obj: any, nodes: any[]) {
    const rootId = obj?.transaction?.roots?.[0]
    return findNodeById(nodes, rootId)
}

function getFirstNodeOfType(nodes: any[], type: string) {
    return nodes.find((node) => getNodeType(node)?.oneofKind === type) ?? null
}

function getRecordFields(value: any) {
    if (value?.sum?.oneofKind !== 'record') {
        return []
    }

    return value.sum.record?.fields ?? []
}

function getFieldValue(value: any, label: string) {
    return getRecordFields(value).find((field: any) => field?.label === label)
        ?.value
}

function getNumericValue(value: any): string | undefined {
    if (value?.sum?.oneofKind === 'numeric' && value.sum.numeric) {
        return value.sum.numeric
    }

    return undefined
}

function extractChoiceIdAndAmount(obj: any) {
    const nodes = obj?.transaction?.nodes ?? []
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return {}
    }

    const primaryNode = getPrimaryNode(obj, nodes)
    const primaryExerciseNode =
        getNodeType(primaryNode)?.oneofKind === 'exercise' ? primaryNode : null
    const exerciseNode =
        primaryExerciseNode || getFirstNodeOfType(nodes, 'exercise')
    const createNode = getFirstNodeOfType(nodes, 'create')

    const exercise = getNodeType(exerciseNode)?.exercise
    const create = getNodeType(createNode)?.create

    const choiceId = exercise?.choiceId
    const exerciseAmount =
        getNumericValue(getFieldValue(exercise?.chosenValue, 'amount')) ??
        getNumericValue(
            getFieldValue(
                getFieldValue(
                    getFieldValue(exercise?.chosenValue, 'allocation'),
                    'transferLeg'
                ),
                'amount'
            )
        )
    const createAmount =
        getNumericValue(getFieldValue(create?.argument, 'amount')) ??
        getNumericValue(
            getFieldValue(
                getFieldValue(create?.argument, 'amount'),
                'initialAmount'
            )
        )
    const amount = exercise ? exerciseAmount : createAmount

    return {
        ...(choiceId ? { choiceId } : {}),
        ...(amount ? { amount } : {}),
    }
}

export function parsePreparedTransaction(
    txBase64: string,
    options?: DecodeOptions
): ParsedTransactionInfo {
    const jsonString = decodePreparedTransactionToJsonString(txBase64, options)
    const obj = JSON.parse(jsonString)

    const result: ParsedTransactionInfo = {
        jsonString,
        isCreate: false,
        isExercise: false,
    }

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

    Object.assign(result, extractChoiceIdAndAmount(obj))

    return result
}
