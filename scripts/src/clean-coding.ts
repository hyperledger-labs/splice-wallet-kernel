import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import { findJsonKeyPosition, traverseDirectory } from './script-utils.js'

function checkPackageJson(packageJsonPath: string): number {
    const rootPath = path.dirname(process.cwd())
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
        folderPath == ''
    ) {
        return 0
    }

    // Ignore imported package names
    if (packageName.startsWith('@')) {
        return 0
    }

    let mismatchCount = 0

    // Check if the folder path matches the package name
    if (packageName !== folderPath) {
        console.error(
            `Mismatch: Folder path '${folderPath}' does not match package name '${packageName}' in workspace '${folderPath}'`
        )
        mismatchCount = +1
    }

    // Check if "main" points to an existing file
    if (
        mainFile &&
        !fs.existsSync(path.join(path.dirname(packageJsonPath), mainFile))
    ) {
        console.error(
            `Error: 'main' field points to a non-existing file '${mainFile}' in workspace '${folderPath}'`
        )
        mismatchCount = +1
    }

    // Check if "types" points to an existing file
    if (
        typesFile &&
        !fs.existsSync(path.join(path.dirname(packageJsonPath), typesFile))
    ) {
        console.error(
            `Error: 'types' field points to a non-existing file '${typesFile}' in workspace '${folderPath}'`
        )
        mismatchCount = +1
    }

    // Check if "type" is set to "module"
    if (packageType !== 'module') {
        const typePosition = findJsonKeyPosition(packageJsonContent, 'type')
        const line = typePosition.line || 1
        const column = typePosition.column || 1
        console.warn(
            `::warning file=${relativePath},line=${line},col=${column}::type should be set to 'module'`
        )
    }

    return mismatchCount
}

function checkTsconfigJson(tsconfigJsonPath: string): number {
    const rootPath = path.dirname(process.cwd())
    const tsconfigContent = fs.readFileSync(tsconfigJsonPath, 'utf-8')
    const tsconfig = JSON.parse(tsconfigContent)
    const extendsFile = tsconfig.extends
    const relativePath = path.relative(rootPath, tsconfigJsonPath)

    // Check if "extends" contains the correct tsconfig.json variation
    if (
        !extendsFile ||
        (!extendsFile.includes('tsconfig.web.json') &&
            !extendsFile.includes('tsconfig.node.json') &&
            !extendsFile.includes('tsconfig.base.json'))
    ) {
        const typePosition = findJsonKeyPosition(tsconfigContent, 'extends')
        const line = typePosition.line || 1
        const column = typePosition.column || 1
        console.warn(
            `::warning file=${relativePath},line=${line},col=${column}::typescript config 'extends' should reference 'tsconfig.web.json', 'tsconfig.node.json', or 'tsconfig.base.json'`
        )
    }

    return 0
}

function main(): void {
    const rootDir = path.dirname(process.cwd())
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
