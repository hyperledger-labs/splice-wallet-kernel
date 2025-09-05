// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DAML_RELEASE_VERSION,
    generateOpenApiClient,
    getRepoRoot,
    SPLICE_VERSION,
} from './utils.js'

interface OpenApiSpec {
    url: string
    output: string
}

// Tagged template function
function github(
    template: TemplateStringsArray,
    tag: string,
    ...paths: string[]
) {
    const repo = template[0].split(':')
    const tagPrefix = repo[1] ? `${repo[1]}/` : ''

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
    },
].concat(tokenStandards)

specs.forEach((spec) => generateOpenApiClient(new URL(spec.url), spec.output))

console.log('Generated fresh TypeScript clients for all OpenAPI specs')
