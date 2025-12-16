// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

declare module '@asyncapi/generator' {
    export interface GeneratorOptions {
        forceWrite?: boolean
        install?: boolean
        debug?: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        templateParams?: Record<string, any>
        mapBaseUrlToFolder?: Record<string, string>
        noOverwriteGlobs?: string
        disabledHooks?: Record<string, boolean | string | string[]>
        output?: string
        entrypoint?: string
    }

    export default class Generator {
        static default: typeof Generator
        constructor(
            templateName: string,
            targetDir: string,
            options?: GeneratorOptions
        )

        generateFromString(asyncapiString: string): Promise<void>
        generateFromFile(asyncapiString: string): Promise<void>
        generateFromUrl(asyncapiString: string): Promise<void>
    }

    // export = Generator
}
