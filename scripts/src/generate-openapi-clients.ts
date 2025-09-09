// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    downloadAndUnpackTarball,
    downloadToFile,
    ensureDir,
    getRepoRoot,
    info,
    SPLICE_SPEC_ARCHIVE_HASH,
    SPLICE_SPEC_PATH,
    SPLICE_VERSION,
    success,
} from './utils.js'
import * as fs from 'fs'
import generateSchema from 'openapi-typescript'
import * as path from 'path'

/**
 * OpenAPI specification details.
 * @property input - The path, relative to the repo root, of the OpenAPI specification file.
 * @property output - The path, relative to the repo root, where the generated TypeScript client should be saved.
 */
interface OpenApiFileSpec {
    input: string
    output: string
}

/**
 * OpenAPI specification details for URL input.
 * @property input - The URL of the OpenAPI specification file.
 * @property output - The path, relative to the repo root, where the generated TypeScript client should be saved.
 * @property specdir - The directory, relative to the repo root, where the OpenAPI yaml file should be saved.
 */
interface OpenApiUrlSpec {
    input: URL
    output: string
    specdir: string
    hash?: string
}

type OpenApiSpec = OpenApiFileSpec | OpenApiUrlSpec

const root = getRepoRoot()

async function fetchSpliceSpecs() {
    const archiveUrl = `https://github.com/digital-asset/decentralized-canton-sync/releases/download/v${SPLICE_VERSION}/${SPLICE_VERSION}_openapi.tar.gz`
    const tarfile = path.join(SPLICE_SPEC_PATH, `${SPLICE_VERSION}.tar.gz`)
    const unpackDir = path.join(root, 'api-specs/splice', SPLICE_VERSION)

    await downloadAndUnpackTarball(archiveUrl, tarfile, unpackDir, {
        hash: SPLICE_SPEC_ARCHIVE_HASH,
        strip: 0,
    })
}

/**
 * Generate a TypeScript OpenAPI client from an input spec and place  .
 * @param param0 OpenApiSpec
 */
async function generateOpenApiClient(spec: OpenApiSpec) {
    const { input, output } = spec
    const message =
        spec.input instanceof URL
            ? 'Generating OpenAPI client from url'
            : 'Generating OpenAPI client from file'

    console.log(`${message}:\n  ${info(input.toString())}\n`)

    try {
        if ('specdir' in spec) {
            // Try a fetch first, because openapi-fetch silently fails if the URL is a 404
            await downloadToFile(
                input,
                path.join(root, spec.specdir),
                spec.hash
            )
        }

        const schema = await generateSchema(input)

        await ensureDir(path.join(root, path.dirname(output)))
        fs.writeFileSync(path.join(root, output), schema)
    } catch (err: unknown) {
        console.error(err)
        process.exit(1)
    }
}

const specs: OpenApiSpec[] = [
    // Canton JSON Ledger API
    {
        input: 'api-specs/ledger-api/3.3.0/openapi.yaml',
        output: 'core/ledger-client/src/generated-clients/openapi-3.3.0-SNAPSHOT.ts',
    },
    // Splice Scan API
    {
        input: `api-specs/splice/${SPLICE_VERSION}/scan.yaml`,
        output: 'core/splice-clients/src/generated-clients/scan.ts',
    },
    // Token standards
    {
        input: `api-specs/splice/${SPLICE_VERSION}/allocation-instruction-v1.yaml`,
        output: 'core/token-standard/src/generated-clients/splice-api-token-allocation-instruction-v1/allocation-instruction-v1.ts',
    },
    {
        input: `api-specs/splice/${SPLICE_VERSION}/allocation-v1.yaml`,
        output: 'core/token-standard/src/generated-clients/splice-api-token-allocation-v1/allocation-v1.ts',
    },
    {
        input: `api-specs/splice/${SPLICE_VERSION}/token-metadata-v1.yaml`,
        output: 'core/token-standard/src/generated-clients/splice-api-token-metadata-v1/token-metadata-v1.ts',
    },
    {
        input: `api-specs/splice/${SPLICE_VERSION}/transfer-instruction-v1.yaml`,
        output: 'core/token-standard/src/generated-clients/splice-api-token-transfer-instruction-v1/transfer-instruction-v1.ts',
    },
]

async function main() {
    await fetchSpliceSpecs()
    Promise.all(specs.map(generateOpenApiClient)).then(() => {
        console.log(
            success('Generated fresh TypeScript clients for all OpenAPI specs')
        )
    })
}

main()
