// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs'
import * as path from 'path'
import { API_SPECS_PATH, markFile } from './lib/utils.js'
import * as jsonc from 'jsonc-parser'

function validateSchemaTitles(fileContent: string, filePath: string): void {
    let missingTitleCount = 0
    let missingAdditionalPropertiesCount = 0
    const root = jsonc.parseTree(fileContent)

    function hasAdditonalProperties(node: jsonc.Node | undefined): boolean {
        if (!node || node.type !== 'object') return false
        for (const prop of node.children ?? []) {
            if (
                prop.type === 'property' &&
                prop.children?.[0]?.value === 'additionalProperties'
            )
                return true
        }
        return false
    }

    function hasTitleOrRef(node: jsonc.Node | undefined): boolean {
        if (!node || node.type !== 'object') return false
        let hasTitle = false,
            hasRef = false
        for (const prop of node.children ?? []) {
            if (
                prop.type === 'property' &&
                prop.children?.[0]?.value === 'title'
            )
                hasTitle = true
            if (
                prop.type === 'property' &&
                prop.children?.[0]?.value === '$ref'
            )
                hasRef = true
        }
        return hasTitle || hasRef
    }

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

    function visit(node: jsonc.Node, inArray: boolean) {
        if (node.type === 'object') {
            let hasType = false
            for (const prop of node.children ?? []) {
                if (
                    prop.type === 'property' &&
                    prop.children?.[0]?.value === 'type'
                ) {
                    hasType = true
                }
            }
            if (!inArray && hasType) {
                if (!hasTitleOrRef(node)) {
                    const keyPath = getKeyPath(node)
                    markFile(
                        filePath,
                        fileContent,
                        keyPath,
                        `Property '${keyPath}' is missing a title or $ref.`,
                        'error'
                    )
                    missingTitleCount++
                }

                if (!hasAdditonalProperties(node)) {
                    const keyPath = getKeyPath(node)
                    markFile(
                        filePath,
                        fileContent,
                        keyPath,
                        `Property '${keyPath}' is missing 'additionalProperties'.`,
                        'error'
                    )
                    missingAdditionalPropertiesCount++
                }
            }
            for (const prop of node.children ?? []) {
                if (prop.type === 'property' && prop.children?.[1]) {
                    visit(prop.children[1], false)
                }
            }
        } else if (node.type === 'array') {
            for (const child of node.children ?? []) {
                visit(child, true)
            }
        }
    }

    if (root) visit(root, false)

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
