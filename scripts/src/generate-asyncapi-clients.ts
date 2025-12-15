// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs'
import * as path from 'path'
import { info, error, repoRoot } from './lib/utils.js'

const Generator = (await import('@asyncapi/generator')).default
interface AsyncApiFileSpec {
    input: string
    output: string
}

async function generateAsyncApiClient(
    spec: AsyncApiFileSpec,
    root: string = repoRoot,
    templateName: string = '@asyncapi/nodejs-ws-template'
) {
    const { input, output } = spec

    console.log(info(` Generating AsyncAPI from input file ${input}`))
    try {
        const filePath = path.join(root, input)

        if (!fs.existsSync(filePath)) {
            throw new Error(`Input file does not exist at ${filePath}`)
        }

        console.info(`Parsing spec from ${filePath}`)

        const absoluteOutputDir = path.resolve(root, output)

        if (!fs.existsSync(absoluteOutputDir)) {
            fs.mkdirSync(absoluteOutputDir, { recursive: true })
        }

        console.log(info(`Output directory: ${absoluteOutputDir}`))
        console.info(info(`Template: ${templateName}`))

        const generator = new Generator(
            '@asyncapi/nodejs-ws-template',
            absoluteOutputDir,
            {
                forceWrite: true,
            }
        )

        await generator.generateFromFile(filePath)

        console.log(info(`Generated ${output}`))

        // const combinedOutput = models.map((model) => model.result).join('\n\n')

        // fs.writeFileSync(outputPath, combinedOutput)

        // console.log(`Generated ${output}`)
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

const specs: AsyncApiFileSpec[] = [
    {
        input: 'api-specs/ledger-api/3.4.7/asyncapi.yaml',
        output: 'core/ledger-client/src/generated-clients/asyncapi-3.4.7-SNAPSHOT.ts',
    },
]

main(specs).catch((error) => console.log(error(`Fatal error: ${error}`)))
