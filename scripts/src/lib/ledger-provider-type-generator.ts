// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { OpenAPI } from '@scalar/openapi-types'
import { dereference } from '@scalar/openapi-parser'
import * as fs from 'node:fs/promises'
import { bundle } from '@scalar/json-magic/bundle'
import { fetchUrls } from '@scalar/json-magic/bundle/plugins/browser'
import { readFiles } from '@scalar/json-magic/bundle/plugins/node'
import path from 'node:path'

// Given an HTTP method (i.e. 'get') and OpenAPI path (i.e. '/v2/parties'), generate a PascalCase type name (i.e. 'GetV2Parties')
function toPascalCase(method: string, path: string) {
    const split = path
        .split('/')
        .flatMap((part) => part.split('-'))
        .flatMap((part) => part.split('{').flatMap((p) => p.split('}')))

    const camelPath = split.reduce((acc, part) => {
        return acc + part.charAt(0).toUpperCase() + part.slice(1)
    }, '')

    const prefix =
        method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()

    return `${prefix}${camelPath}`
}

type OpenAPISchema =
    | {
          type: 'string' | 'number' | 'integer' | 'boolean'
          title?: string
      }
    | {
          type: 'array'
          title?: string
          items: OpenAPISchema
      }
    | {
          type: 'object'
          title?: string
          properties: Record<string, OpenAPISchema>
          required?: string[]
          additionalProperties?: boolean
      }
    | {
          $ref: string
      }
    | {
          oneOf: OpenAPISchema[]
      }

type ParamSchema = {
    required?: boolean
    schema: OpenAPISchema
}

type OpenApiParameters = {
    path?: {
        [k: string]: ParamSchema
    }
    query?: {
        [k: string]: ParamSchema
    }
}

export class LedgerProviderTypeGenerator {
    constructor(private spec: OpenAPI.Document) {}

    // Generate a TypeScript components interface with all schemas defined in the OpenAPI spec
    public generateComponents(): string {
        let content = ''
        content += `interface components {\n`
        content += `  schemas: {\n`
        Object.entries(this.spec?.components?.schemas || {}).forEach(
            ([name, schema]) => {
                const s = schema as OpenAPISchema

                content += `${name}: `
                content += this.generateSchema(s)
                content += `;\n`
            }
        )
        content += `  }\n`
        content += `}\n\n`

        return content
    }

    // Generate a big union type of all possible Ledger API operations, with the correct request body and response types based on the OpenAPI spec. The resulting shape is compatible with the Provider type argument, defined in core/splice-provider.
    public generateLedgerTypes(): string {
        const lapiTypes: string[] = []
        let content = ''

        Object.entries(this.spec?.paths || {}).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, operation]) => {
                const typeName = toPascalCase(method, path)
                lapiTypes.push(typeName)

                const op = operation as OpenAPI.Operation

                const body =
                    op.requestBody?.content?.['application/json']?.schema ||
                    null

                const parameters = op.parameters?.reduce<OpenApiParameters>(
                    (acc, param) => {
                        if (param.in === 'path') {
                            if (!acc.path) {
                                acc.path = {}
                            }
                            acc.path[param.name] = {
                                required: param.required,
                                schema: param.schema,
                            }
                        } else if (param.in === 'query') {
                            if (!acc.query) {
                                acc.query = {}
                            }
                            acc.query[param.name] = {
                                required: param.required,
                                schema: param.schema,
                            }
                        }
                        return acc
                    },
                    {}
                )

                const result =
                    op.responses?.['200']?.content?.['application/json']
                        ?.schema || null

                content += `export type ${typeName} = {\n`
                content += `      ledgerApi: {\n`
                content += `          params: {\n`
                content += `            resource: '${path}'\n`
                content += `            requestMethod: '${method}'\n`
                if (body) {
                    content += `            body: ${this.generateSchema(body)}\n`
                }
                if (parameters?.path) {
                    content += `            path: ${this.generateParamSchemas(parameters.path)}\n`
                }
                if (parameters?.query) {
                    content += `            query: ${this.generateParamSchemas(parameters.query)}\n`
                }
                content += `          }\n`
                content += `        result: ${this.generateSchema(result)}\n`
                content += `    }\n`
                content += `  };\n`
            })
        })

        content += `\n`
        content += `export type LedgerTypes = \n`
        lapiTypes.forEach((name) => {
            content += `  | ${name}\n`
        })
        content += `\n`
        return content
    }

    // Given an OpenAPI schema, generate the corresponding TypeScript type. Also handles $ref resolution by indexing into the spec's components. This is a recursive function that can handle nested schemas.
    private generateSchema(schema: OpenAPISchema): string {
        if (!schema) {
            return 'unknown'
        }

        // utilize short-circuiting to return the first successful result
        return (
            this.generateSchemaRef(schema) ||
            this.generateSchemaPrimitive(schema) ||
            this.generateSchemaArray(schema) ||
            this.generateSchemaObject(schema) ||
            this.generateSchemaOneOf(schema) ||
            'unknown'
        )
    }

    private generateParamSchemas(params: Record<string, ParamSchema>): string {
        let content = '{\n'
        Object.entries(params).forEach(([key, param]) => {
            content += param.required
                ? `'${key}': ${this.generateSchema(param.schema)};\n`
                : `'${key}'?: ${this.generateSchema(param.schema)};\n`
        })
        content += '}\n'
        return content
    }

    private generateSchemaRef(schema: OpenAPISchema): string | undefined {
        if ('$ref' in schema) {
            const refPath = schema.$ref.split('/').slice(1) // Remove initial '#'
            const refSchema = refPath.reduce((acc, part) => {
                if (acc && typeof acc === 'object' && part in acc) {
                    return acc[part]
                } else {
                    throw new Error(`Invalid $ref path: ${schema.$ref}`)
                }
            }, this.spec)

            if (!refSchema) {
                throw new Error(`Referenced schema not found: ${schema.$ref}`)
            }

            return `components['${refPath.slice(1).join("']['")}']`
        }
    }

    private generateSchemaPrimitive(schema: OpenAPISchema): string | undefined {
        if ('type' in schema) {
            if (schema.type === 'integer' || schema.type === 'number') {
                //using number | string makes this incompatible with the ledger-client openapi generated types
                return 'number' // Ledger API often uses strings for numeric values to avoid precision issues
            }

            if (schema.type === 'string' || schema.type === 'boolean') {
                return schema.type
            }
        }
    }

    private generateSchemaArray(schema: OpenAPISchema): string | undefined {
        if ('type' in schema && schema.type === 'array') {
            return `Array<${this.generateSchema(schema.items)}>`
        }
    }

    private generateSchemaObject(schema: OpenAPISchema): string | undefined {
        if ('type' in schema && schema.type === 'object') {
            const additionalProperties = schema.additionalProperties
            let generatedAdditionalProperties = undefined

            if (typeof additionalProperties === 'object') {
                generatedAdditionalProperties = `{ [key: string]: ${this.generateSchema(additionalProperties)} }`
            }
            if (
                typeof additionalProperties === 'boolean' &&
                additionalProperties
            ) {
                generatedAdditionalProperties = `{ [key: string]: unknown }`
            }

            const required = schema.required || []
            const properties = schema.properties
                ? `{` +
                  Object.entries(schema.properties)
                      .map(([key, value]) => {
                          return required.includes(key)
                              ? `${key}: ${this.generateSchema(value)}`
                              : `${key}?: ${this.generateSchema(value)}`
                      })
                      .join('; ') +
                  `}`
                : 'Record<string, never>'

            return generatedAdditionalProperties
                ? `${properties} & ${generatedAdditionalProperties}`
                : properties
        }
    }

    private generateSchemaOneOf(schema: OpenAPISchema): string | undefined {
        if ('oneOf' in schema) {
            return schema.oneOf.map((s) => this.generateSchema(s)).join(' | ')
        }
    }
}

async function loadOpenApiSpec(input: string) {
    console.log(`Dereferencing OpenAPI spec at: ${input}`)

    const accessible = await fs.access(input, fs.constants.F_OK).then(
        () => true,
        () => false
    )

    if (accessible) {
        console.log('File exists, proceeding with dereferencing...')
    } else {
        console.error(`File not found at path: ${input}`)
        process.exit(1)
    }

    // Load a file and all referenced files
    const data = await bundle(input, {
        plugins: [
            readFiles(),
            fetchUrls({
                limit: 5,
            }),
        ],
        treeShake: false,
    })

    return dereference(data)
}

export async function generateLedgerProviderTypes(
    input: string,
    output: string
): Promise<void> {
    const { specification } = await loadOpenApiSpec(input)
    if (!specification) {
        throw new Error('Failed to load OpenAPI specification')
    }

    const generator = new LedgerProviderTypeGenerator(specification)

    let fileContent = `// This file is auto-generated by scripts/src/generate-openapi-types.ts\n\n`

    fileContent += generator.generateComponents()
    fileContent += generator.generateLedgerTypes()

    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, fileContent)
}
