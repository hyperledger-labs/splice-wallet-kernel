// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export const DEFAULT_PAGE_REDIRECT = '/wallets'
export const NOT_FOUND_PAGE_REDIRECT = '/404'
export const LOGIN_PAGE_REDIRECT = '/login'
export const ALLOWED_ROUTES = [
    '/login',
    '/wallets',
    '/settings',
    '/transactions',
    '/approve',
    '/',
    '/404',
] as const

export type AllowedRoute = (typeof ALLOWED_ROUTES)[number]

export function isAllowedRoute(path: string): path is AllowedRoute {
    if (path.startsWith('/callback')) {
        return true
    }
    return ALLOWED_ROUTES.includes(path as (typeof ALLOWED_ROUTES)[number])
}
