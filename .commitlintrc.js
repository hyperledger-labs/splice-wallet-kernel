// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import proc from 'node:child_process'

const scopes = ['release', 'deps', 'deps-dev']

const getScopes = () => {
    const projects = JSON.parse(
        proc.execFileSync('pnpm', ['nx', 'show', 'projects', '--json'], {
            encoding: 'utf-8',
        })
    ).map((project) => project.split('/')[1])

    return () => [2, 'always', projects.concat(scopes)]
}

export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'scope-enum': (ctx) => getScopes()(ctx),
    },
}
