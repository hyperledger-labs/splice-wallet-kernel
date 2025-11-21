// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'

import fs from 'node:fs'
import path from 'node:path'
import dts from 'rollup-plugin-dts'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const DAML_JS_PACKAGES = [
    '@daml.js/token-standard-models-1.0.0',
    '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0',
    '@daml.js/daml-stdlib-DA-Time-Types-1.0.0',
]

function buildPathsMap(pkgs) {
    const map = {}
    for (const name of pkgs) {
        const pkgJsonPath = require.resolve(path.join(name, 'package.json'))
        const pkgDir = path.dirname(pkgJsonPath)
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
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
const pathsMap = buildPathsMap(DAML_JS_PACKAGES)

const pkgPath = path.resolve(process.cwd(), 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

// Collect deps + peerDeps (but not devDeps, or excepeted ones)
const exceptions = ['@daml/types', '@daml/ledger']
const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
].filter((dep) => !exceptions.includes(dep))

// bundle ESM
const codeEsm = {
    input: 'src/index.ts',
    output: { file: 'dist/index.js', format: 'es', sourcemap: true },
    external,
    plugins: [
        json(),
        commonjs({ transformMixedEsModules: true }),
        nodeResolve(),
        typescript(),
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
        json(),
        commonjs({ transformMixedEsModules: true }),
        nodeResolve(),
        typescript(),
    ],
}

// bundle for browser
const codeBrowser = {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.browser.js',
        format: 'es',
        sourcemap: true,
        platform: 'browser',
    },
    external: ['node-fetch'],
    plugins: [
        json(),
        commonjs({ transformMixedEsModules: true }),
        nodeResolve({
            browser: true, // Prefer browser entrypoints
            exportConditions: ['browser', 'default'],
            preferBuiltins: false, // Do NOT use Node builtins
        }),
        typescript(),
    ],
}

// bundle DTS including types from codegen
const types = {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [
        dts({
            respectExternal: false,
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
