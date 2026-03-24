// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

declare module 'k6' {
    export function check(
        val: unknown,
        sets: Record<string, (value: unknown) => boolean>,
        tags?: Record<string, string>
    ): boolean
    export function fail(message: string): never
}

declare module 'k6/options' {
    export interface Options {
        scenarios?: Record<string, unknown>
        thresholds?: Record<string, string[]>
    }
}

declare module 'k6/http' {
    export interface RefinedResponse<T extends string = 'text'> {
        status: number
        body: T extends 'text' ? string : unknown
    }
    export interface Params {
        headers?: Record<string, string>
        tags?: Record<string, string>
        timeout?: string
    }
    export function get(url: string, params?: Params): RefinedResponse<'text'>
    export function post(
        url: string,
        body?: string,
        params?: Params
    ): RefinedResponse<'text'>
    const http: {
        get: typeof get
        post: typeof post
    }
    export default http
}

declare module 'k6/metrics' {
    export class Counter {
        constructor(name: string)
        add(value: number, tags?: Record<string, string>): void
    }
}

declare const __ENV: Record<string, string | undefined>
declare const __ITER: number
declare const __VU: number
declare function open(path: string): string
