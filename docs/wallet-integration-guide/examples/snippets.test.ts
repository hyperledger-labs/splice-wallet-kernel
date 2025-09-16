import { test, expect, jest } from '@jest/globals'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

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
        __esModule: true, // Use it when dealing with esModules
        ...originalModule,
        createKeyPair: jest.fn().mockReturnValue(mockKeyPair),
    }
})

describe('testing doc snippets', () => {
    const snippets = readdirSync('./snippets').filter((f) => f.endsWith('.ts'))

    for (const filename of snippets) {
        const fullpath = path.join(__dirname, './snippets', filename)
        const contents = readFileSync(fullpath)

        if (contents.includes('// @disable-snapshot-test')) {
            continue
        }

        test(
            filename,
            async () => {
                const mod = await import(fullpath.replace('.ts', '.js'))
                expect(mod.default).toBeDefined()

                const result = await mod.default()

                // Run `yarn jest -u` to update snapshots for new changes
                expect(result).toMatchSnapshot()
            },
            10000
        )
    }
})
