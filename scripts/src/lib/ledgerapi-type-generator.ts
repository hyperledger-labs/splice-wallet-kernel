// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { OpenAPI } from '@scalar/openapi-types'

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
          type: 'string' | 'number' | 'boolean'
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

export class LedgerApiTypeGenerator {
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

                const result =
                    op.responses?.['200']?.content?.['application/json']
                        ?.schema || null

                content += `export type ${typeName} = {\n`
                content += `      ledgerApi: {\n`
                content += `          params: {\n`
                content += `            resource: '${path}'\n`
                content += `            requestMethod: '${method}'\n`
                if (op.requestBody) {
                    content += `            body: ${this.generateSchema(body)}\n`
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
            'unknown'
        )
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
            if (
                schema.type === 'string' ||
                schema.type === 'number' ||
                schema.type === 'boolean'
            ) {
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
                : 'unknown'
            return properties
        }
    }
}
