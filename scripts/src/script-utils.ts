import * as fs from 'fs'
import * as path from 'path'

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
