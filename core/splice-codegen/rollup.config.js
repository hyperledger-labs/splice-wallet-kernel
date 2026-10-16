// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import alias from '@rollup/plugin-alias'

import fs from 'node:fs'
import path from 'node:path'
import dts from 'rollup-plugin-dts'

const TEST_TOKEN_BASE = path.resolve(
    import.meta.dirname,
    '../../damljs/splice-test-token-v1'
)

const OTC_TRADE_BASE = path.resolve(
    import.meta.dirname,
    '../../damljs/splice-token-test-trading-app'
)

const TEST_TOKEN_V2_BASE = path.resolve(
    import.meta.dirname,
    '../../damljs/splice-test-token-v2'
)

function buildDamlJsPackagesMap(baseDir) {
    const packages = {}
    const entries = fs.readdirSync(baseDir, { withFileTypes: true })

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue
        }

        const pkgDir = path.join(baseDir, entry.name)
        const pkgJsonPath = path.join(pkgDir, 'package.json')

        if (!fs.existsSync(pkgJsonPath)) {
            continue
        }

        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        if (typeof pkgJson.name !== 'string') {
            continue
        }

        if (!pkgJson.name.startsWith('@daml.js/')) {
            continue
        }

        packages[pkgJson.name] = pkgDir
    }

    return packages
}

const TEST_TOKEN_COMPAT_ALIAS = '@daml.js/test-token-v1'
const TEST_TOKEN_CANONICAL_PREFIX = '@daml.js/splice-test-token-v1'
const OTC_TRADE_COMPAT_ALIAS = '@daml.js/otc-trade'
const OTC_TRADE_CANONICAL_PREFIX = '@daml.js/splice-token-test-trading-app'

const TEST_TOKEN_V2_COMPAT_ALIAS = '@daml.js/test-token-v2'
const TEST_TOKEN_V2_CANONICAL_PREFIX = '@daml.js/splice-test-token-v2'

const DAML_JS_PACKAGES = {
    testToken: buildDamlJsPackagesMap(TEST_TOKEN_BASE),
    testTokenV2: buildDamlJsPackagesMap(TEST_TOKEN_V2_BASE),
    otcTrade: buildDamlJsPackagesMap(OTC_TRADE_BASE),
}

// Flatten DAML_JS_PACKAGES into a single map for rollup config
const allDamlJsPackages = {
    ...DAML_JS_PACKAGES.testToken,
    ...DAML_JS_PACKAGES.otcTrade,
    ...DAML_JS_PACKAGES.testTokenV2,
}

function findPackageDirByPrefix(packages, prefix) {
    const packageName = Object.keys(packages).find((name) =>
        name.startsWith(prefix)
    )

    return packageName ? packages[packageName] : undefined
}

// Add compatibility aliases
const testTokenCompatTarget = findPackageDirByPrefix(
    DAML_JS_PACKAGES.testToken,
    TEST_TOKEN_CANONICAL_PREFIX
)

if (testTokenCompatTarget) {
    allDamlJsPackages[TEST_TOKEN_COMPAT_ALIAS] = testTokenCompatTarget
}

const otcTradeCompatTarget = findPackageDirByPrefix(
    DAML_JS_PACKAGES.otcTrade,
    OTC_TRADE_CANONICAL_PREFIX
)

if (otcTradeCompatTarget) {
    allDamlJsPackages[OTC_TRADE_COMPAT_ALIAS] = otcTradeCompatTarget
}

const testTokenV2CompatTarget = findPackageDirByPrefix(
    DAML_JS_PACKAGES.testTokenV2,
    TEST_TOKEN_V2_CANONICAL_PREFIX
)

if (testTokenV2CompatTarget) {
    allDamlJsPackages[TEST_TOKEN_V2_COMPAT_ALIAS] = testTokenV2CompatTarget
}

function buildPathsMap(packageDirs) {
    const map = {}
    for (const [name, pkgDir] of Object.entries(packageDirs)) {
        const pkgJson = JSON.parse(
            fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')
        )
        const typesRel = pkgJson.types || pkgJson.typings || 'lib/index.d.ts'
        const typesAbs = path.resolve(pkgDir, typesRel)
        const libDir = path.resolve(pkgDir, 'lib')
        map[name] = [typesAbs]
        map[`${name}/*`] = [path.join(libDir, '*')]

        // Force deep "module.js" -> ".d.ts" resolution so dts can inline
        map[`${name}/lib/*/module.js`] = [path.join(libDir, '*/module.d.ts')]
        map[`${name}/lib/*/index.js`] = [path.join(libDir, '*/index.d.ts')]
    }
    return map
}

function buildAliasEntries(packageDirs) {
    const entries = []
    for (const [name, pkgDir] of Object.entries(packageDirs)) {
        const pkgJson = JSON.parse(
            fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')
        )
        const mainAbs = path.resolve(pkgDir, pkgJson.main || 'lib/index.js')
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // Sub-path must come before main to avoid premature matching
        entries.push({
            find: new RegExp(`^${escapedName}/(.+)$`),
            replacement: `${pkgDir}/$1`,
        })
        entries.push({ find: name, replacement: mainAbs })
    }
    return entries
}

const pathsMap = buildPathsMap(allDamlJsPackages)
const damlJsAlias = alias({ entries: buildAliasEntries(allDamlJsPackages) })
const commonjsPlugin = commonjs({
    transformMixedEsModules: true,
    esmExternals: true,
    requireReturnsDefault: false,
})

const typescriptPlugin = typescript({
    tsconfig: './tsconfig.lib.json',
    compilerOptions: {
        baseUrl: '.',
        paths: pathsMap,
    },
})

const pkgPath = path.resolve(process.cwd(), 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

// Collect deps + peerDeps + transitive deps that should be external
const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    // Transitive dependencies from damljs packages
    '@daml/types',
    '@daml/ledger',
    '@mojotech/json-type-validation',
    // Node built-ins
    'node:fs',
    'node:url',
    'node:path',
]

// bundle ESM
const codeEsm = {
    input: 'src/index.ts',
    output: { file: 'dist/index.js', format: 'es', sourcemap: true },
    external,
    plugins: [
        damlJsAlias,
        json(),
        commonjsPlugin,
        nodeResolve(),
        typescriptPlugin,
    ],
}

// bundle CJS
const codeCjs = {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.cjs',
        format: 'cjs',
        interop: 'auto',
        sourcemap: true,
        exports: 'named',
    },
    external,
    plugins: [
        damlJsAlias,
        json(),
        commonjsPlugin,
        nodeResolve(),
        typescriptPlugin,
    ],
}

// bundle for browser
const codeBrowser = {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.browser.js',
        format: 'es',
        sourcemap: true,
    },
    external,
    plugins: [
        damlJsAlias,
        json(),
        commonjsPlugin,
        nodeResolve({
            browser: true, // Prefer browser entrypoints
            preferBuiltins: false, // Do NOT use Node builtins
        }),
        typescriptPlugin,
    ],
}

// bundle DTS including types from codegen
const types = {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    external,
    plugins: [
        dts({
            respectExternal: true,
            compilerOptions: {
                baseUrl: '.',
                paths: pathsMap,
                declaration: true,
                emitDeclarationOnly: true,
            },
        }),
    ],
}

export default [codeEsm, codeCjs, codeBrowser, types]
