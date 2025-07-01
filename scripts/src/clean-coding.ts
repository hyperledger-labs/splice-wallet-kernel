import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import { getRepoRoot, markFile, traverseDirectory } from './utils.js'
import { info } from 'console'

function checkPackageJson(packageJsonPath: string): number {
    const rootPath = getRepoRoot()
    console.log(info(`cwd: ${process.cwd()}`))
    console.log(info(`Root path: ${rootPath}`))
    console.log(info(`Checking package.json at: ${packageJsonPath}`))
    const folderPath = path
        .relative(rootPath, path.dirname(packageJsonPath))
        .replace(/\//g, '-')
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent)
    // Allow names with specific prefixes according to docs/CLEANCODING.md
    const packageName = packageJson.name?.replace(
        /^splice-wallet-(kernel-)?/,
        ''
    )
    const mainFile = packageJson.main
    const typesFile = packageJson.types
    const packageType = packageJson.type
    const relativePath = path.relative(rootPath, packageJsonPath)

    // Ignore paths containing .yarn or .vite or root directory
    if (
        folderPath.includes('.yarn') ||
        folderPath.includes('.vite') ||
        folderPath.includes('.canton') ||
        folderPath == ''
    ) {
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
    if (packageName !== folderPath) {
        markFile(
            relativePath,
            packageJsonContent,
            '',
            `Folder path '${folderPath}' does not match package name '${packageName}' in workspace '${folderPath}'`,
            `error`
        )
        mismatchCount = +1
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
        mismatchCount = +1
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
        mismatchCount = +1
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

    // Check if "extends" contains the correct tsconfig.json variation
    if (
        !extendsFile ||
        (!extendsFile.includes('tsconfig.web.json') &&
            !extendsFile.includes('tsconfig.node.json') &&
            !extendsFile.includes('tsconfig.base.json'))
    ) {
        markFile(
            relativePath,
            tsconfigContent,
            'extends',
            `typescript config 'extends' should reference 'tsconfig.web.json', 'tsconfig.node.json', or 'tsconfig.base.json'`,
            `warn`
        )
    }

    return 0
}

function main(): void {
    const rootDir = getRepoRoot()
    let errorCount = 0
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
