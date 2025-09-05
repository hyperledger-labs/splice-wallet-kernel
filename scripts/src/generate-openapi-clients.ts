// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DAML_RELEASE_VERSION,
    ensureDir,
    error,
    getRepoRoot,
    info,
    SPLICE_VERSION,
    success,
} from './utils.js'
import * as fs from 'fs'
import generateSchema from 'openapi-typescript'

interface OpenApiSpec {
    url: string
    output: string
    preprocess?: (ts: string) => string
}

export async function generateOpenApiClient({
    url: u,
    output,
    preprocess,
}: OpenApiSpec) {
    const url = new URL(u)
    console.log(
        'Generating OpenAPI client from url:\n  ' + info(url.toString()) + '\n'
    )
    try {
        // Try a fetch first, because openapi-fetch silently fails if the URL is a 404
        await fetch(url).then((res) => {
            if (res.status < 200 || res.status >= 300)
                throw new Error(
                    error(`Failed to fetch ${url}: ${res.statusText}`)
                )
        })
        const schema = await generateSchema(url).then(preprocess)
        console.log(schema.slice(0, 100))
        await ensureDir(output)
        fs.writeFileSync(output, schema)
    } catch (err: unknown) {
        console.error(err)
        process.exit(1)
    }
}

// Tagged template function
function github(
    template: TemplateStringsArray,
    tag: string,
    ...paths: string[]
) {
    const repo = template[0].split(':')
    const tagPrefix = repo[1] || ''

    // Zip the path segments together
    const rest = template.slice(1).reduce((prev, current, index) => {
        if (index < paths.length) {
            return prev + current + paths[index]
        } else {
            return prev + current
        }
    }, '')

    return `https://raw.githubusercontent.com/${repo[0]}/refs/tags/${tagPrefix}${tag}${rest}`
}

const tokenStandards: OpenApiSpec[] = [
    {
        directory: 'splice-api-token-allocation-instruction-v1',
        file: 'allocation-instruction-v1',
    },
    {
        directory: 'splice-api-token-allocation-v1',
        file: 'allocation-v1',
    },
    {
        directory: 'splice-api-token-metadata-v1',
        file: 'token-metadata-v1',
    },
    {
        directory: 'splice-api-token-transfer-instruction-v1',
        file: 'transfer-instruction-v1',
    },
].map(({ directory, file }) => ({
    url: github`hyperledger-labs/splice:${SPLICE_VERSION}/token-standard/${directory}/openapi/${file}.yaml`,
    output: `${getRepoRoot()}/core/token-standard/src/generated-clients/${directory}/${file}.ts`,
}))

// Specs to generate
const specs: OpenApiSpec[] = [
    {
        // Canton JSON Ledger API
        url: github`digital-asset/daml:v${DAML_RELEASE_VERSION}/sdk/canton/community/ledger/ledger-json-api/src/test/resources/json-api-docs/openapi.yaml`,
        output: `${getRepoRoot()}/core/ledger-client/src/generated-clients/openapi-3.3.0-SNAPSHOT.ts`,
    },
    {
        // Splice Scan API
        url: github`hyperledger-labs/splice:${SPLICE_VERSION}/apps/scan/src/main/openapi/scan.yaml`,
        output: `${getRepoRoot()}/core/scan-client/src/generated-clients/scan.ts`,
        preprocess: (ts: string) => {
            let newTs = ts.replace(
                `external["scan.yaml"]["components"]`,
                'components'
            )
            newTs = newTs.replaceAll('event_type: string;', '')
            return newTs
        },
    },
].concat(tokenStandards)

Promise.all(specs.map(generateOpenApiClient)).then(() => {
    console.log(
        success('Generated fresh TypeScript clients for all OpenAPI specs')
    )
})
