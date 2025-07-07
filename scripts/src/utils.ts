import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import { blue, green, italic, red, yellow } from 'yoctocolors'

export const info = (message: string): string => italic(blue(message))
export const warn = (message: string): string => yellow(message)
export const error = (message: string): string => red(message)
export const success = (message: string): string => green(message)

// Get the root of the current repository
// Assumption: the root of the repository is the closest
//     ancestor directory of the CWD that contains a .git directory
export function getRepoRoot(): string {
    const cwd = process.cwd()
    const segments = cwd.split('/')

    for (let i = segments.length; i > 0; i--) {
        const potentialRoot = segments.slice(0, i).join('/')
        if (fs.existsSync(path.join(potentialRoot, '.git'))) {
            return potentialRoot
        }
    }

    console.error(
        error(`${cwd} does not seem to be inside a valid git repository.`)
    )
    process.exit(1)
}

const repoRoot = getRepoRoot()
export const CANTON_PATH = path.join(repoRoot, '.canton')
export const CANTON_BIN = path.join(CANTON_PATH, 'bin/canton')
export const CANTON_CONF = path.join(repoRoot, 'canton.conf')
export const CANTON_BOOTSTRAP = path.join(repoRoot, 'canton-bootstrap.canton')
export const API_SPECS_PATH = path.join(repoRoot, 'api-specs')

// Canton versions
export const DAML_RELEASE_VERSION = '3.4.0-snapshot.20250625.0'
export const CANTON_VERSION = '3.4.0-snapshot.20250617.16217.0.vbdf62919'
export const CANTON_ARCHIVE_HASH =
    '5f1bf64d5d3bf50c4dd379bca44d46069e6ece43377177a6e09b4ff0979f640d'

export function findJsonKeyPosition(
    jsonContent: string,
    key: string
): { line: number; column: number } {
    const lines = jsonContent.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const column = lines[i].indexOf(`"${key}"`)
        if (column !== -1) {
            return { line: i + 1, column: column + 1 }
        }
    }
    return { line: 1, column: 1 }
}

export function traverseDirectory(
    directory: string,
    callback: (filePath: string) => void
): void {
    const entries = fs.readdirSync(directory)
    for (const entry of entries) {
        const fullPath = path.join(directory, entry)
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDirectory(fullPath, callback)
        } else {
            callback(fullPath)
        }
    }
}

export type markingLevel = 'info' | 'warn' | 'error'
export function markFile(
    relativePath: string,
    fileContent: string,
    key: string,
    warning: string,
    markingLevel: markingLevel
): void {
    const typePosition = findJsonKeyPosition(fileContent, key)
    const line = typePosition.line || 1
    const column = typePosition.column || 1
    if (markingLevel === 'error') {
        console.error(
            `::error file=${relativePath},line=${line},col=${column}::${warning}`
        )
    } else if (markingLevel === 'warn') {
        console.warn(
            `::warning file=${relativePath},line=${line},col=${column}::${warning}`
        )
    } else if (markingLevel === 'info') {
        console.info(
            `::info file=${relativePath},line=${line},col=${column}::${warning}`
        )
    }
}
