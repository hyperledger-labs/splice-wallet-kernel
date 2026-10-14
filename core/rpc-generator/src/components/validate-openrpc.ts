// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { components } from '@open-rpc/generator'

const objectSchemaIssues = (node: unknown, path: string[]): string[] => {
    if (Array.isArray(node)) {
        return node.flatMap((child, i) =>
            objectSchemaIssues(child, [...path, String(i)])
        )
    }
    if (typeof node !== 'object' || node === null) return []

    const issues: string[] = []
    if ('type' in node && node.type === 'object') {
        const at = path.join('.')
        if (!('title' in node) && !('$ref' in node)) {
            issues.push(`'${at}' is missing a title or $ref`)
        }
        if (!('additionalProperties' in node)) {
            issues.push(`'${at}' is missing 'additionalProperties'`)
        }
    }
    return issues.concat(
        Object.entries(node).flatMap(([key, child]) =>
            objectSchemaIssues(child, [...path, key])
        )
    )
}

export const validateOpenRpc: components.FHook = async (
    _dest,
    _from,
    _component,
    openrpcDocument
): Promise<void> => {
    const issues = [
        // Generated clients and controllers pass the whole JSON-RPC `params` as a single argument.
        ...openrpcDocument.methods.flatMap((method) =>
            'params' in method && method.params.length > 1
                ? [`Method '${method.name}' must declare at most one param`]
                : []
        ),
        ...objectSchemaIssues(openrpcDocument, []),
    ]
    if (issues.length > 0) {
        throw new Error(
            `Invalid OpenRPC document '${openrpcDocument.info.title}':\n- ${issues.join('\n- ')}`
        )
    }
}
