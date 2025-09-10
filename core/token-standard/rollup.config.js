// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

import fs from 'fs'
import path from 'path'

const pkgPath = path.resolve(process.cwd(), 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

// Collect deps + peerDeps (but not devDeps, or excepeted ones)
const exceptions = ['@daml/types']
const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
].filter((dep) => !exceptions.includes(dep))

export default {
    input: 'src/index.ts',
    output: {
        dir: 'dist',
        format: 'es',
    },
    external,
    plugins: [
        commonjs({
            transformMixedEsModules: true,
        }),
        typescript(),
        nodeResolve(),
    ],
}
