import type { Config } from 'jest'

export default {
    rootDir: 'src',
    extensionsToTreatAsEsm: ['.ts'],
    resolver: 'ts-jest-resolver',
    transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest',
    },
} satisfies Config
