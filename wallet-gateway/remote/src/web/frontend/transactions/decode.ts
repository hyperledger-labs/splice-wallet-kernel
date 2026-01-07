// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { decodePreparedTransaction } from '@canton-network/core-tx-visualizer'

export interface PreparedTransactionParsed {
    jsonString: string
    signatories?: string[]
    stakeholders?: string[]
    packageName?: string
    moduleName?: string
    entityName?: string
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
): PreparedTransactionParsed {
    const jsonString = decodePreparedTransactionToJsonString(txBase64)
    const obj = JSON.parse(jsonString)

    const result: PreparedTransactionParsed = { jsonString }

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
        // Continue walking the object
        for (const key of Object.keys(value)) {
            deepSearch(value[key])
        }
    }

    deepSearch(obj)
    return result
}
