// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import ts from 'typescript'
import { getRepoRoot, markFile, traverseDirectory } from './lib/utils.js'

function checkPackageJson(packageJsonPath: string): number {
    const rootPath = getRepoRoot()
    const folderPath = path
        .relative(rootPath, path.dirname(packageJsonPath))
        .replace(/\//g, '-')
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent)
    // Allow names with specific prefixes according to docs/CLEANCODING.md
    const packageName: string = packageJson.name?.replace(
        /^splice-(wallet-)?(kernel-)?/,
        ''
    )
    const mainFile = packageJson.main
    const typesFile = packageJson.types
    const packageType = packageJson.type
    const relativePath = path.relative(rootPath, packageJsonPath)

    // Ignore paths containing .vite or root directory
    if (
        folderPath.includes('node_modules') ||
        folderPath.includes('.vite') ||
        folderPath.includes('.canton') ||
        folderPath.includes('.cache') ||
        folderPath.includes('rpc-generator') ||
        folderPath == ''
    ) {
        return 0
    }

    if (!packageName) {
        console.error(
            'skipping: package.json missing "name" field in workspace',
            folderPath
        )
        return 0
    }

    // Ignore if package.json start with an underscore
    if (relativePath.split('/').pop()?.startsWith('_')) {
        return 0
    }

    // Ignore imported package names
    if (packageName.startsWith('@')) {
        return 0
    }

    let mismatchCount = 0

    // Check if the folder path matches the package name
    if (!folderPath.split('').every((f) => packageName.includes(f))) {
        markFile(
            relativePath,
            packageJsonContent,
            '',
            `Folder path '${folderPath}' does not match package name '${packageName}' in workspace '${folderPath}'`,
            `error`
        )
        mismatchCount += 1
    }

    // Check if "main" points to an existing file
    if (
        mainFile &&
        !fs.existsSync(path.join(path.dirname(packageJsonPath), mainFile))
    ) {
        markFile(
            relativePath,
            packageJsonContent,
            'main',
            `'main' field points to a non-existing file '${mainFile}' in workspace '${folderPath}'`,
            `error`
        )
        mismatchCount += 1
    }

    // Check if "types" points to an existing file
    if (
        typesFile &&
        !fs.existsSync(path.join(path.dirname(packageJsonPath), typesFile))
    ) {
        markFile(
            relativePath,
            packageJsonContent,
            'types',
            `'types' field points to a non-existing file '${typesFile}' in workspace '${folderPath}'`,
            `error`
        )
        mismatchCount += 1
    }

    // Check if "type" is set to "module"
    if (packageType !== 'module') {
        markFile(
            relativePath,
            packageJsonContent,
            'type',
            `type should be set to 'module'`,
            `warn`
        )
    }

    return mismatchCount
}

function checkTsconfigJson(tsconfigJsonPath: string): number {
    const tsconfigContent = fs.readFileSync(tsconfigJsonPath, 'utf-8')
    const tsconfig = JSON.parse(tsconfigContent)
    const extendsFile = tsconfig.extends
    const relativePath = path.relative(getRepoRoot(), tsconfigJsonPath)

    if (
        tsconfigJsonPath.includes('examples/') ||
        tsconfigJsonPath.includes('damljs/')
    ) {
        return 0 // Skip example tsconfig files
    }

    // Check if "extends" contains the correct tsconfig.json variation
    if (
        !extendsFile ||
        (!extendsFile.includes('tsconfig.web.json') &&
            !extendsFile.includes('tsconfig.base.json'))
    ) {
        markFile(
            relativePath,
            tsconfigContent,
            'extends',
            `typescript config 'extends' should reference 'tsconfig.web.json', or 'tsconfig.base.json'`,
            `warn`
        )
    }

    return 0
}

// TypeScript sources that are not owned by any workspace package's typecheck
const TYPECHECK_IGNORED = [/^core\/rpc-generator\/templates\//]

interface TypecheckConfig {
    path: string
    // `tsc -b` also checks project references, `tsc -p` does not
    followReferences: boolean
}

/** Configs checked by the `tsc` commands of a script, defaulting to `tsconfig.json` */
function configsFromTypecheckScript(script: string): TypecheckConfig[] {
    const configs: TypecheckConfig[] = []
    for (const command of script.split(/&&|\|\||;/)) {
        const [bin, ...args] = command.trim().split(/\s+/)
        if (bin !== 'tsc') continue
        if (args[0] === '-b' || args[0] === '--build') {
            const paths = args.slice(1).filter((a) => !a.startsWith('-'))
            for (const configPath of paths.length ? paths : ['tsconfig.json']) {
                configs.push({ path: configPath, followReferences: true })
            }
        } else {
            const flag = args.findIndex((a) => a === '-p' || a === '--project')
            configs.push({
                path: (flag >= 0 && args[flag + 1]) || 'tsconfig.json',
                followReferences: false,
            })
        }
    }
    return configs
}

/** All files a tsconfig includes, reporting config errors to `errors` */
function filesOfConfig(
    configPath: string,
    followReferences: boolean,
    errors: string[],
    seen = new Set<string>()
): string[] {
    const file =
        fs.existsSync(configPath) && fs.statSync(configPath).isDirectory()
            ? path.join(configPath, 'tsconfig.json')
            : configPath
    if (seen.has(file)) return []
    seen.add(file)
    const diagnostics: ts.Diagnostic[] = []
    const parsed = ts.getParsedCommandLineOfConfigFile(
        file,
        {},
        {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic: (d) => diagnostics.push(d),
        }
    )
    diagnostics.push(...(parsed?.errors ?? []))
    errors.push(
        ...diagnostics.map((d) =>
            ts.flattenDiagnosticMessageText(d.messageText, ' ')
        )
    )
    if (!parsed) return []
    const references = followReferences
        ? (parsed.projectReferences ?? []).flatMap((ref) =>
              filesOfConfig(
                  ts.resolveProjectReferencePath(ref),
                  true,
                  errors,
                  seen
              )
          )
        : []
    return [...parsed.fileNames, ...references]
}

/**
 * Every workspace package with TypeScript sources must have a `typecheck` script,
 * and every tracked TypeScript file (including tests) must be covered by it.
 */
function checkTypecheckCoverage(rootDir: string): number {
    const tracked = execFileSync(
        'git',
        ['ls-files', '*.ts', '*.tsx', '*.mts', '*.cts', '**/package.json'],
        { cwd: rootDir, encoding: 'utf-8' }
    )
        .split('\n')
        .filter(Boolean)
    const packageDirs = tracked
        .filter((f) => f.endsWith('package.json') && f !== 'package.json')
        .map(path.dirname)
        .sort((a, b) => b.length - a.length)
    const sources = tracked.filter(
        (f) =>
            /\.[cm]?tsx?$/.test(f) &&
            !f.endsWith('.d.ts') &&
            !TYPECHECK_IGNORED.some((re) => re.test(f))
    )

    const sourcesByPackage = new Map<string, string[]>()
    for (const file of sources) {
        const owner = packageDirs.find((dir) => file.startsWith(`${dir}/`))
        if (!owner) continue
        sourcesByPackage.set(owner, [
            ...(sourcesByPackage.get(owner) ?? []),
            file,
        ])
    }

    let errorCount = 0
    for (const [dir, files] of sourcesByPackage) {
        const packageJsonPath = path.join(dir, 'package.json')
        const packageJsonContent = fs.readFileSync(
            path.join(rootDir, packageJsonPath),
            'utf-8'
        )
        const typecheck: string | undefined =
            JSON.parse(packageJsonContent).scripts?.typecheck
        if (!typecheck) {
            markFile(
                packageJsonPath,
                packageJsonContent,
                'scripts',
                `missing 'typecheck' script in workspace '${dir}'`,
                'error'
            )
            errorCount++
            continue
        }

        const configErrors: string[] = []
        const covered = new Set(
            configsFromTypecheckScript(typecheck)
                .flatMap((config) =>
                    filesOfConfig(
                        path.join(rootDir, dir, config.path),
                        config.followReferences,
                        configErrors
                    )
                )
                .map((f) => path.relative(rootDir, f))
        )
        if (configErrors.length > 0) {
            markFile(
                packageJsonPath,
                packageJsonContent,
                'typecheck',
                `invalid typecheck config in workspace '${dir}': ${configErrors.join('; ')}`,
                'error'
            )
            errorCount++
            continue
        }
        for (const file of files.filter((f) => !covered.has(f))) {
            console.error(
                `::error file=${file},line=1,col=1::not covered by the 'typecheck' script of workspace '${dir}'`
            )
            errorCount++
        }
    }
    return errorCount
}

// static, side-effect and dynamic imports or requires of test-only modules
const TEST_ONLY_IMPORT =
    /(?:\bfrom|\bimport|\bimport\s*\(|\brequire\s*\()\s*['"](vitest|@vitest\/[^'"]+|@playwright\/test|@logtape\/testing[^'"]*|supertest)['"]/
// Packages that exist to provide test utilities
const TEST_ONLY_PACKAGES = ['core/wallet-test-utils/']

/**
 * Test-only code must live in `__tests__` directories (or be a test file) so builds
 * exclude it from `dist`. Detected via imports of test-only modules.
 */
function checkTestOnlyCodeLocation(rootDir: string): number {
    const sources = execFileSync('git', ['ls-files', '*.ts', '*.tsx'], {
        cwd: rootDir,
        encoding: 'utf-8',
    })
        .split('\n')
        .filter(Boolean)

    let errorCount = 0
    for (const file of sources) {
        if (/(^|\/)__test__\//.test(file)) {
            console.error(
                `::error file=${file},line=1,col=1::use '__tests__' instead of '__test__' for test directories`
            )
            errorCount++
            continue
        }
        if (
            !file.includes('/src/') ||
            /\.(test|spec)\.tsx?$/.test(file) ||
            file.includes('/__tests__/') ||
            TEST_ONLY_PACKAGES.some((dir) => file.startsWith(dir))
        ) {
            continue
        }
        const content = fs.readFileSync(path.join(rootDir, file), 'utf-8')
        const match = content.match(TEST_ONLY_IMPORT)
        if (match) {
            console.error(
                `::error file=${file},line=1,col=1::imports test-only module '${match[1]}', move it into a '__tests__' directory so it is not published`
            )
            errorCount++
        }
    }
    return errorCount
}

function main(): void {
    const rootDir = getRepoRoot()
    let errorCount =
        checkTypecheckCoverage(rootDir) + checkTestOnlyCodeLocation(rootDir)
    traverseDirectory(rootDir, (filePath) => {
        if (filePath.endsWith('package.json')) {
            errorCount += checkPackageJson(filePath)
        }
        if (filePath.endsWith('tsconfig.json')) {
            errorCount += checkTsconfigJson(filePath)
        }
    })

    if (errorCount > 0) {
        process.exit(1)
    } else process.exit(0)
}

main()
