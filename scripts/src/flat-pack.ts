// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { FlatPack } from './lib/flat-pack.js'
import { Command } from '@commander-js/extra-typings'

const command = new Command()
    .description('Flat pack a package and its dependencies')
    .argument('<pkgDir>')
    .action((pkgDir) => {
        const flatPack = new FlatPack(pkgDir)
        const out = flatPack.pack()
        console.log('completed flat pack to: ' + out)
    })

command.parse(process.argv)
