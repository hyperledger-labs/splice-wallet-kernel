import * as fs from 'fs'
import * as path from 'path'
import generateSchema from 'openapi-typescript'
import {
    getRepoRoot,
    info,
    warn,
    error,
    success,
    SPLICE_PATH,
    getAllFilesWithExtension,
    ensureDir,
    copyFileRecursive,
    traverseDirectory,
    API_SPECS_PATH,
} from './utils.js'

const SRC_DIR = path.join(SPLICE_PATH, 'token-standard')
const OUTPUT_SPECS_DIR = path.join(API_SPECS_PATH, 'token-standard')
const OUTPUT_CLIENTS_DIR = path.join(
    getRepoRoot(),
    'core',
    'token-standard',
    'src',
    'generated-clients'
)

async function extractOpenApiSpecs() {
    if (!fs.existsSync(SRC_DIR)) {
        console.log(
            warn(
                `Source directory not found: ${SRC_DIR}. Make sure the Splice repo is downloaded into "${SPLICE_PATH}".`
            )
        )
        return 0
    }

    console.log(info(`Scanning for OpenAPI YAMLs under ${SRC_DIR} ...`))

    const yamlFiles = [
        ...getAllFilesWithExtension(SRC_DIR, '.yaml'),
        ...getAllFilesWithExtension(SRC_DIR, '.yml'),
    ]
        .filter((p) => p.includes(`${path.sep}openapi${path.sep}`))
        .filter((p) => !/docker-compose/i.test(path.basename(p)))

    if (yamlFiles.length === 0) {
        console.log(
            warn('No OpenAPI YAML files found inside any "openapi/" folder.')
        )
        return 0
    }

    await ensureDir(OUTPUT_SPECS_DIR)

    let copiedCount = 0
    const byPackage = new Map<string, string[]>()

    for (const srcFile of yamlFiles) {
        const relFromTokenStandard = path.relative(SRC_DIR, srcFile)
        const parts = relFromTokenStandard.split(path.sep)
        const pkg = parts[0] // first-level package dir under token-standard

        if (!pkg) {
            console.log(warn(`Skipping unexpected path: ${srcFile}`))
            continue
        }

        const outputDir = path.join(OUTPUT_SPECS_DIR, pkg)
        await ensureDir(outputDir)

        const outputFile = path.join(outputDir, path.basename(srcFile))

        try {
            await copyFileRecursive(srcFile, outputFile)
            copiedCount++

            if (!byPackage.has(pkg)) byPackage.set(pkg, [])
            byPackage.get(pkg)!.push(path.basename(outputFile))
        } catch (e) {
            console.error(
                error(`Failed to copy "${srcFile}" -> "${outputFile}": ${e}`)
            )
        }
    }

    console.log(
        success(`Copied ${copiedCount} OpenAPI file(s) to ${OUTPUT_SPECS_DIR}.`)
    )
    return copiedCount
}

async function generateClientsFromSpecs() {
    if (!fs.existsSync(OUTPUT_SPECS_DIR)) {
        console.log(error(`Specs directory not found: ${OUTPUT_SPECS_DIR}`))
        process.exit(1)
    }

    console.log(
        info(`Generating clients from specs in ${OUTPUT_SPECS_DIR} ...`)
    )
    await ensureDir(OUTPUT_CLIENTS_DIR)

    const yamlFiles: string[] = []
    traverseDirectory(OUTPUT_SPECS_DIR, (p) => {
        const base = path.basename(p)
        const isYaml = base.endsWith('.yaml') || base.endsWith('.yml')
        if (isYaml && !/docker-compose/i.test(base)) {
            yamlFiles.push(p)
        }
    })

    if (yamlFiles.length === 0) {
        console.log(warn('No OpenAPI YAML files found (after exclusions).'))
        return 0
    }

    let generatedCount = 0
    for (const inputPath of yamlFiles.sort()) {
        const rel = path.relative(OUTPUT_SPECS_DIR, inputPath)
        const parts = rel.split(path.sep)
        const pkg = parts[0] || 'root'
        const outDir = path.join(OUTPUT_CLIENTS_DIR, pkg)
        await ensureDir(outDir)

        const outFile = path
            .basename(inputPath)
            .replace(/\.(yaml|yml)$/i, '.ts')
        const outputPath = path.join(outDir, outFile)

        try {
            const schema = await generateSchema(inputPath)
            fs.writeFileSync(outputPath, schema)
            generatedCount++
        } catch (e) {
            console.error(
                error(
                    `Failed to generate from ${path.relative(
                        OUTPUT_SPECS_DIR,
                        inputPath
                    )}: ${e instanceof Error ? e.message : String(e)}`
                )
            )
        }
    }

    console.log(
        success(
            `Generated ${generatedCount} TypeScript clients into ${OUTPUT_CLIENTS_DIR}`
        )
    )
    return generatedCount
}

export async function generateTokenStandardClients() {
    try {
        const copiedCount = await extractOpenApiSpecs()
        // Even if nothing copied from SPLICE_PATH, try to generate from whatever is in OUTPUT_SPECS_DIR
        const generated = await generateClientsFromSpecs()
        console.log(
            success(
                `Done. Specs copied: ${copiedCount}, clients generated: ${generated}.`
            )
        )
    } catch (e) {
        console.error(
            error(
                `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
            )
        )
        process.exit(1)
    }
}

generateTokenStandardClients()
