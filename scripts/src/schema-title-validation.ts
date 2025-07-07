import * as fs from 'fs'
import * as path from 'path'
import {
    JSONSchema,
    JSONSchemaObject,
    MethodObject,
    MethodOrReference,
    OpenrpcDocument as OpenRPC,
} from '@open-rpc/meta-schema'
import { API_SPECS_PATH, markFile } from './utils.js'

function validateSchemaTitles(fileContent: string, filePath: string): void {
    let missingTitleCount = 0
    const openrpcDocument: OpenRPC = JSON.parse(fileContent)
    console.log(`validating ${filePath}`)

    // Validate components.schemas
    if (openrpcDocument.components?.schemas) {
        const schemas = openrpcDocument.components.schemas
        Object.keys(schemas).forEach((schemaName) => {
            const schema = schemas[schemaName]
            if (!schema.title) {
                markFile(
                    filePath,
                    fileContent,
                    schemaName,
                    `'${schemaName}' is missing a title.`,
                    `error`
                )
                missingTitleCount++
            }

            missingTitleCount += validateParameters(
                filePath,
                fileContent,
                schema.properties
            )
        })
    }

    // validate method parameter schemas
    filterMethodObjects(openrpcDocument.methods).forEach((method) => {
        missingTitleCount += validateParameters(
            filePath,
            fileContent,
            method?.params
        )
    })

    if (missingTitleCount === 0) {
        console.log(
            `All schemas and method parameter properties in file '${filePath}' have titles.`
        )
    }
}

function validateParameters(
    filePath: string,
    fileContent: string,
    params: object
): number {
    let missingParameterTitleCount = 0
    console.log(`validating parameters: ${JSON.stringify(params)}`)
    if (params) {
        if (params.isArray) {
            params.foreach((param: object) => {
                const schema = getJSONSchemaObject(param.schema)
                if (schema.title === undefined) {
                    markFile(
                        filePath,
                        fileContent,
                        param,
                        `'${param}' is missing a title.`,
                        `error`
                    )
                    missingParameterTitleCount++
                }

                if (schema.properties) {
                    for (const [key, value] of Object.entries(
                        schema.properties
                    )) {
                        if (
                            value &&
                            value.$ref === undefined &&
                            value.title === undefined
                        ) {
                            markFile(
                                filePath,
                                fileContent,
                                key,
                                `'${param.name}:${key}' is missing a title.`,
                                `error`
                            )
                            missingParameterTitleCount++
                        }
                    }
                }
            })
        } else {
            const schema = getJSONSchemaObject(params.schema)
            if (schema.title === undefined) {
                markFile(
                    filePath,
                    fileContent,
                    params.name,
                    `'${params.name}' is missing a title.`,
                    `error`
                )
                missingParameterTitleCount++
            }

            if (schema.properties) {
                for (const [key, value] of Object.entries(schema.properties)) {
                    if (
                        value &&
                        value.$ref === undefined &&
                        value.title === undefined
                    ) {
                        markFile(
                            filePath,
                            fileContent,
                            key,
                            `'${params.name}:${key}' is missing a title.`,
                            `error`
                        )
                        missingParameterTitleCount++
                    }
                }
            }
        }
    }
    return missingParameterTitleCount
}

function filterMethodObjects(array: MethodOrReference[]): MethodObject[] {
    return array.filter(
        (item): item is MethodObject => 'params' in item && 'name' in item
    )
}

function isJSONSchemaObject(schema: JSONSchema): schema is JSONSchemaObject {
    return typeof schema === 'object' && schema !== null
}

function getJSONSchemaObject(schema: JSONSchema): JSONSchemaObject {
    if (isJSONSchemaObject(schema)) {
        return schema
    }
    return {}
}

function main(): void {
    const files = fs.readdirSync(API_SPECS_PATH)
    console.log(`Found ${files.length} files in ${API_SPECS_PATH}`)

    files.forEach((file) => {
        const filePath = path.join(API_SPECS_PATH, file)
        if (file.endsWith('api.json')) {
            const fileContent = fs.readFileSync(filePath, 'utf-8')

            validateSchemaTitles(fileContent, filePath)
        }
    })
}

main()
