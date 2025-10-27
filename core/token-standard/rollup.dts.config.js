// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import dts from 'rollup-plugin-dts'
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const DAML_JS_PACKAGES = [
    '@daml.js/token-standard-models-1.0.0',
    '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0',
    '@daml.js/daml-stdlib-DA-Time-Types-1.0.0',
]

function buildPathsMap(pkgNames) {
    const map = {}
    for (const name of pkgNames) {
        const pkgJsonPath = require.resolve(path.join(name, 'package.json'))
        const pkgDir = path.dirname(pkgJsonPath)
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        const typesRel = pkgJson.types || pkgJson.typings || 'lib/index.d.ts'
        map[name] = [path.resolve(pkgDir, typesRel)]
    }
    return map
}
const pathsMap = buildPathsMap(DAML_JS_PACKAGES)

export default {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'es' }],
    external: (id) => id === '@daml/types' || id === '@daml/ledger',
    plugins: [
        dts({
            respectExternal: false,
            compilerOptions: { baseUrl: '.', paths: pathsMap },
        }),
    ],
}
