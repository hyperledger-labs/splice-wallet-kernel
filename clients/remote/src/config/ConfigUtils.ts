import * as path from 'path'
import { readFileSync } from 'fs'

export class ConfigUtils {
    static loadConfigFile(filePath: string) {
        const __dirname = path.resolve()

        const resolvedFilePath = path.join(__dirname, filePath)

        return JSON.parse(readFileSync(resolvedFilePath, 'utf-8'))
    }
}
