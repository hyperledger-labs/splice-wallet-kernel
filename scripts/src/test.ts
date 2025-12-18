// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getRepoRoot, info, error } from './lib/utils.js'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

function generateTypesFromSchema(
    schemaName: string,
    schema: any,
    indent: string = ''
): string {
    if (!schema) return ''

    const lines: string[] = []

    if (schema.$ref) {
        const refParts = schema.$ref.split('/')
        return refParts[refParts.length - 1]
    }

    if (schema.oneOf) {
        lines.push(`${indent}export type ${schemaName} = `)
        const types = schema.oneOf
            .map((s: any) => {
                if (s.$ref) {
                    const refParts = s.$ref.split('/')
                    return refParts[refParts.length - 1]
                }

                if (s.type === 'object' && s.properties) {
                    const propEntries = Object.entries<any>(s.properties)

                    if (propEntries.length === 1) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const [propName, propSchema] = propEntries[0]

                        if (propSchema.$ref) {
                            const refParts = propSchema.$ref.split('/')
                            return refParts[refParts.length - 1]
                        }
                    }

                    return getTypeScriptType(s)
                }

                return getTypeScriptType(s)
            })
            .filter(Boolean)

        if (types.length > 0) {
            lines.push(`${indent} | ${types.join('\n | ')};`)
        } else {
            lines.push(`${indent} any`)
        }
    } else if (schema.type === 'object' && schema.properties) {
        lines.push(`${indent}export interface ${schemaName} {`)

        for (const [propName, propSchema] of Object.entries<any>(
            schema.properties
        )) {
            const optional = schema.required?.includes(propName) ? '' : '?'
            const propType = getTypeScriptType(propSchema)

            if (propSchema.description) {
                lines.push(`${indent} /** ${propSchema.description} **/`)
            }

            lines.push(`${indent} ${propName}${optional}: ${propType}`)
        }

        lines.push(`${indent}}`)
    } else {
        lines.push(
            `${indent}export type ${schemaName} = ${getTypeScriptType(schema)}`
        )
    }

    return lines.join('\n')
}

function getTypeScriptType(schema: any): string {
    if (!schema) return 'any'

    if (schema.$ref) {
        const refParts = schema.$ref.split('/')
        return refParts[refParts.length - 1]
    }

    if (schema.enum) {
        return schema.enum.map((v: any) => `'${v}'`).join(' | ')
    }

    if (schema.type === 'array' && schema.items) {
        return `${getTypeScriptType(schema.items)}[]`
    }

    if (schema.type === 'object') {
        if (schema.additionalProperties) {
            const valueType =
                typeof schema.additionalProperties === 'object'
                    ? getTypeScriptType(schema.additionalProperties)
                    : 'any'

            return `Record<string, ${valueType}>`
        }

        if (schema.properties) {
            const props = Object.entries<any>(schema.process)
                .map(([key, val]) => {
                    const optional = schema.required?.includes(key) ? '' : '?'
                    return `${key}${optional}: ${getTypeScriptType(val)}`
                })
                .join('; ')
            return `{ ${props} }`
        }

        return 'Record<string, any>'
    }

    if (schema.oneOf) {
        return schema.oneOf.map(getTypeScriptType).join(' | ')
    }

    if (schema.anyOf) {
        return schema.anyOf.map(getTypeScriptType).join(' | ')
    }

    if (schema.allOf) {
        return schema.oneOf.map(getTypeScriptType).join(' & ')
    }

    const typeMap: Record<string, string> = {
        string: 'string',
        number: 'number',
        integer: 'number',
        boolean: 'boolean',
        null: 'null',
        undefined: 'undefined',
    }

    return typeMap[schema.type] || 'any'
}

interface AsyncApiFileSpec {
    input: string
    output: string
}

const specs: AsyncApiFileSpec[] = [
    {
        input: 'api-specs/ledger-api/3.4.7/asyncapi.yaml',
        output: 'core/ledger-client/src/generated-clients/asyncapi-3.4.7.ts',
    },
]

async function generateAsyncApiClient(
    spec: AsyncApiFileSpec,
    root: string = getRepoRoot()
) {
    const { input, output } = spec

    console.log(info(` Generating AsyncAPI from input file ${input}`))
    try {
        const filePath = path.join(root, input)
        const specs = fs.readFileSync(filePath, 'utf8')

        if (!fs.existsSync(filePath)) {
            throw new Error(`Input file does not exist at ${filePath}`)
        }

        let asyncapiDoc: any
        const ext = path.extname(filePath).toLowerCase()
        if (ext === '.yaml' || ext === '.yml') {
            asyncapiDoc = yaml.load(specs)
        } else if (ext === '.json') {
            asyncapiDoc = JSON.parse(specs)
        } else {
            throw new Error('Unsupported file format.')
        }

        console.info(info(`Parsing spec from ${filePath}`))

        const outputLines: string[] = []

        outputLines.push(
            '// This file is auto-generated from AsyncAPI specification'
        )
        outputLines.push('// Do not edit manually')

        const generatedSchemas = new Set<string>()

        if (asyncapiDoc.components?.schemas) {
            outputLines.push('//Message Schemas')

            for (const [schemaName, schema] of Object.entries(
                asyncapiDoc.components.schemas
            )) {
                try {
                    if (!generatedSchemas.has(schemaName)) {
                        outputLines.push(
                            generateTypesFromSchema(schemaName, schema)
                        )
                        outputLines.push('')
                        generatedSchemas.add(schemaName)
                    }
                } catch (err) {
                    console.log(
                        error(
                            `Could not generate schema for ${schemaName}. error is: ${err}`
                        )
                    )
                }
            }
        }

        if (asyncapiDoc.channels) {
            outputLines.push('// WebSocket Channel Definitions')

            const channels: string[] = []

            for (const [channelPath, channel] of Object.entries<any>(
                asyncapiDoc.channels
            )) {
                // const safeName = channelPath
                //     .replace(/^\//, '')
                //     .replace(/[^a-zA-Z0-9]/g, '_')

                let subscribeMessageType = 'any'
                let publishMessageType = 'any'

                if (channel.subscribe?.message?.$ref) {
                    const ref = channel.subscribe.message.$ref.split('/').pop()
                    subscribeMessageType = ref || 'any'
                }

                if (channel.publish?.message?.$ref) {
                    const ref = channel.publish.message.$ref.split('/').pop()
                    publishMessageType = ref || 'any'
                }

                channels.push(`   '${channelPath}': {
                        subscribe: ${subscribeMessageType};
                        publish: ${publishMessageType};

                    }`)
            }

            outputLines.push('export interface WebSocketChannels{')
            outputLines.push(channels.join(';\n'))
            outputLines.push('}')
            outputLines.push('')

            outputLines.push('export const CHANNELS = {')
            for (const channelPath of Object.keys(asyncapiDoc.channels)) {
                const safeName = channelPath
                    .replace(/^\//, '')
                    .replace(/[^a-zA-Z0-9]/g, '_')

                outputLines.push(`  ${safeName}: '${channelPath}' as const,`)

                // outputLines.push('} as const;')
                outputLines.push('')
            }
            outputLines.push('}')
        }

        if (asyncapiDoc.info) {
            outputLines.push('// API Info')
            outputLines.push(' export const API_INFO = {')
            outputLines.push(`  title: '${asyncapiDoc.info.title}',`)
            outputLines.push(`  version: '${asyncapiDoc.info.version}',`)

            if (asyncapiDoc.info.description) {
                outputLines.push(
                    `  description: '${asyncapiDoc.info.description.replace(/'/g, "\\'")}',`
                )
            }

            outputLines.push('} as const;')
            outputLines.push('')
        }

        const outputPath = path.join(root, output)
        // const outputDir = path.dirname(outputPath)
        console.info(info(`writing to output path ${outputPath}`))

        // if (!fs.existsSync(outputDir)) {
        //     fs.mkdirSync(outputDir, { recursive: true })
        // }
        fs.writeFileSync(outputPath, outputLines.join('\n'))

        console.info(info(`Generated: ${output}`))
    } catch (err: unknown) {
        console.log(error(`error generating async client ${err}`))
        process.exit(1)
    }
}

async function main(specs: AsyncApiFileSpec[], root: string = process.cwd()) {
    await Promise.all(
        specs.map((spec) => generateAsyncApiClient(spec, root))
    ).then(() =>
        console.log('Generated typescript clients for all async api specs')
    )
}

main(specs).catch((error) => console.log(error(`Fatal error: ${error}`)))
