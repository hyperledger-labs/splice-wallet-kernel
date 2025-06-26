import { readdirSync, writeFileSync, mkdirSync } from 'fs'
import * as path from 'path'
import generateSchema from 'openapi-typescript'
import * as process from 'process'

const rootPath = path.dirname(process.cwd())
// Directories
const OUTPUT_DIR = `${rootPath}/core/ledger-client/generated-clients`
const SPECS_DIR = `${rootPath}/api-specs/ledger-api`

// Read all files in the specs directory
const files = readdirSync(SPECS_DIR)

files.forEach(async (file) => {
    const fileName = path.basename(file)
    mkdirSync(OUTPUT_DIR, { recursive: true })

    // Check if the file starts with "openapi-"
    if (fileName.startsWith('openapi-')) {
        const inputPath = path.join(SPECS_DIR, file)
        const outputPath = path.join(
            OUTPUT_DIR,
            `${fileName.replace('.yaml', '.d.ts')}`
        )

        const schema = await generateSchema(inputPath)
        writeFileSync(outputPath, schema)
    }

    // Uncomment and implement if asyncapi functionality is needed
    // if (fileName.startsWith('asyncapi-')) {
    //   const inputPath = join(SPECS_DIR, file);
    //   // Implement asyncapi functionality here
    // }
})

console.log('Generated fresh TypeScript clients for all ledger API specs')
