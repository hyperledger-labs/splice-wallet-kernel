// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { transform } from '@swc/core'
import type { Plugin } from 'vite'

/**
 * Transforms standard decorators (and `accessor`) with SWC, as oxc does not
 * transform them. Only files containing a `@` are passed to SWC.
 */
export function standardDecorators(include: string): Plugin {
    return {
        name: 'standard-decorators',
        transform: {
            filter: { id: include, code: '@' },
            handler: (code, id) =>
                transform(code, {
                    filename: id,
                    sourceMaps: true,
                    jsc: {
                        target: 'es2022',
                        parser: { syntax: 'typescript', decorators: true },
                        transform: { decoratorVersion: '2023-11' },
                    },
                }),
        },
    }
}
