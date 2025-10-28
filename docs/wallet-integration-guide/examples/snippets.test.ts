import { test, expect, describe, jest } from '@jest/globals'
import { readdirSync, readFileSync } from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

// WARNING: the `allocate-party.ts` snippet does not succeed if ran 2 or more times without stopping and restarting localnet (as the same mocked party identity is then already onboarded)

const mockKeyPair = {
    publicKey: '+5E6ccwzeYq0CEyjSoIQNNFq8v31xCfVCm+PxSXyUxs=',
    privateKey:
        'oQ+sEiZeiBtPrhneCtlceaW6th6M6jyg1xQroaTiQP77kTpxzDN5irQITKNKghA00Wry/fXEJ9UKb4/FJfJTGw==',
}

jest.mock('uuid', () => {
    return {
        v4: jest.fn().mockReturnValue('6e747c98-2d9a-4ec6-8e22-c4bc40948c41'),
    }
})

jest.mock('@canton-network/core-signing-lib', () => {
    // Require the original module to not be mocked...
    const originalModule = jest.requireActual(
        '@canton-network/core-signing-lib'
    ) as any

    return {
        ...originalModule,
        createKeyPair: jest.fn().mockReturnValue(mockKeyPair),
    }
})

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
            30000
        )
    }
})
