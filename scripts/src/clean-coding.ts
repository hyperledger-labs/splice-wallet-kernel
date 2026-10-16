// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
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
    let errorCount = checkTestOnlyCodeLocation(rootDir)
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
