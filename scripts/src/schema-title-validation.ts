// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs'
import * as path from 'path'
import { API_SPECS_PATH, markFile } from './lib/utils.js'
import * as jsonc from 'jsonc-parser'

// Recursively fetch all child nodes of a JSON object that have a specific property key/value pair
function getAllChildrenWithProperty(
    node: jsonc.Node,
    propertyName: string,
    propertyValue: string
): jsonc.Node[] {
    let result: jsonc.Node[] = []
    if (node.type === 'object') {
        for (const prop of node.children ?? []) {
            if (
                prop.type === 'property' &&
                prop.children?.[0]?.value === propertyName &&
                prop.children?.[1]?.value === propertyValue
            ) {
                result.push(node)
            }

            const child = prop.children?.[1]
            if (child) {
                result = result.concat(
                    getAllChildrenWithProperty(
                        prop.children?.[1],
                        propertyName,
                        propertyValue
                    )
                )
            }
        }
    } else if (node.type === 'array') {
        for (const child of node.children ?? []) {
            result = result.concat(
                getAllChildrenWithProperty(child, propertyName, propertyValue)
            )
        }
    }
    return result
}

// Check if a JSON object node has any of the specified attributes set
function hasAttributesSet(node: jsonc.Node, attributes: string[]): boolean {
    const attributeSet = new Set<string>()
    for (const prop of node.children ?? []) {
        if (prop.type === 'property' && prop.children?.[0]?.value) {
            attributeSet.add(prop.children[0].value as string)
        }
    }
    return attributes.some((attr) => attributeSet.has(attr))
}

// Get the JSON path of a node in dot notation (e.g., "components.schemas.MySchema")
function getKeyPath(node: jsonc.Node): string {
    const path: string[] = []
    let current: jsonc.Node | undefined = node
    while (current && current.parent) {
        if (
            current.parent.type === 'property' &&
            current.parent.children?.[0]
        ) {
            path.unshift(current.parent.children[0].value as string)
        }
        current = current.parent
    }
    return path.join('.')
}

function validateSchemaTitles(fileContent: string, filePath: string): void {
    let missingTitleCount = 0
    let missingAdditionalPropertiesCount = 0

    const root = jsonc.parseTree(fileContent)

    if (!root) {
        console.warn(
            `Could not parse JSON content of file '${filePath}'. Skipping title validation.`
        )
        return
    }

    const objectSchemaNodes = getAllChildrenWithProperty(root, 'type', 'object')

    objectSchemaNodes
        .filter((node) => !hasAttributesSet(node, ['title', '$ref']))
        .forEach((node) => {
            const keyPath = getKeyPath(node)

            markFile(
                filePath,
                fileContent,
                keyPath,
                `Property '${keyPath}' is missing a title or $ref.`,
                'error'
            )
            missingTitleCount++
        })

    /**
     * The JSON node we get here has three levels:
     *  - The top-level is the container representing the JSON object
     *  - The first-level children contain the properties of the object
     *  - Each property node has two children: the key and the value
     */
    objectSchemaNodes
        .filter((node) => {
            // Filter JSON nodes to only the set of those representing RPC object schemas.
            // We do this by checking if the node has a child property with the first subchild being 'type' and the second subchild being 'object'.
            const typeProperty = node.children?.find(
                (child) =>
                    child.type === 'property' &&
                    child.children?.[0]?.value === 'type' &&
                    child.children?.[1]?.value === 'object'
            )
            return !!typeProperty
        })
        .filter((node) => {
            // Next, we filter for those object schemas that are missing the 'additionalProperties' attribute, which is required for all object schemas in our API spec.
            return !hasAttributesSet(node, ['additionalProperties'])
        })
        .forEach((node) => {
            // Finally, we mark the files and increment the count of missing 'additionalProperties' attributes for any nodes that are missing this attribute.
            const keyPath = jsonc.getNodePath(node).join('.')

            markFile(
                filePath,
                fileContent,
                keyPath,
                `Property '${keyPath}' is missing 'additionalProperties'.`,
                'error'
            )
            missingAdditionalPropertiesCount++
        })

    if (missingTitleCount === 0) {
        console.log(
            `All schemas and method parameter/result properties in file '${filePath}' have titles or $ref.`
        )
    }

    if (missingAdditionalPropertiesCount === 0) {
        console.log(
            `All schemas and method parameter/result properties in file '${filePath}' have 'additionalProperties'.`
        )
    }
}

function main(): void {
    const files = fs.readdirSync(API_SPECS_PATH)

    files.forEach((file) => {
        const filePath = path.join(API_SPECS_PATH, file)
        if (file.endsWith('api.json')) {
            const fileContent = fs.readFileSync(filePath, 'utf-8')
            validateSchemaTitles(fileContent, filePath)
        }
    })
}

main()
