import { test, expect, describe, jest } from '@jest/globals'
import { readdirSync, readFileSync } from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const snippets = readdirSync('./snippets').filter(
    (f) =>
        f.endsWith('.ts') &&
        !readFileSync(`./snippets/${f}`).includes('// @disable-snapshot-test')
)

describe('testing doc snippets', () => {
    for (const filename of snippets) {
        const __dirname = dirname(fileURLToPath(import.meta.url))
        const fullpath = path.join(__dirname, './snippets', filename)

        test(
            filename,
            async () => {
                const { default: fn } = await import(fullpath)
                expect(fn).toBeDefined()

                const result = await fn()
                // Run `yarn jest -u` to update snapshots for new changes
                expect(result).toMatchSnapshot()
            },
            120_000
        )
    }
})

const snippetsV1 = readdirSync('./snippets/v1').filter(
    (f) =>
        f.endsWith('.ts') &&
        !readFileSync(`./snippets/v1/${f}`).includes(
            '// @disable-snapshot-test'
        )
)

describe('testing doc snippets v1', () => {
    for (const filename of snippetsV1) {
        const __dirname = dirname(fileURLToPath(import.meta.url))
        const fullpath = path.join(__dirname, './snippets/v1', filename)

        test(
            filename,
            async () => {
                const { default: fn } = await import(fullpath)
                expect(fn).toBeDefined()

                const result = await fn()
                // Run `yarn jest -u` to update snapshots for new changes
                expect(result).toMatchSnapshot()
            },
            120_000
        )
    }
})
