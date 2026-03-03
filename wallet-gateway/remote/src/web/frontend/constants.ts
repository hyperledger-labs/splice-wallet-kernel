// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export const DEFAULT_PAGE_REDIRECT = '/wallets'
export const NOT_FOUND_PAGE_REDIRECT = '/404'
export const LOGIN_PAGE_REDIRECT = '/login'
export const TRANSACTIONS_PAGE_REDIRECT = '/transactions'
export const ALLOWED_ROUTES = [
    '/login',
    '/wallets',
    '/settings',
    '/transactions',
    '/approve',
    '/',
    '/404',
    '/callback',
] as const

export type AllowedRoute = (typeof ALLOWED_ROUTES)[number]

export function isAllowedRoute(path: string): path is AllowedRoute {
    return ALLOWED_ROUTES.includes(path as (typeof ALLOWED_ROUTES)[number])
}

const NON_ROOT_ROUTES = ALLOWED_ROUTES.filter(
    (route): route is Exclude<AllowedRoute, '/'> => route !== '/'
).sort((left, right) => right.length - left.length)

export function normalizePathname(pathname: string): string {
    if (!pathname || pathname === '/') {
        return '/'
    }

    return pathname.replace(/\/+$/, '') || '/'
}

export function getCurrentRoute(pathname: string): AllowedRoute | null {
    const normalizedPath = normalizePathname(pathname)

    if (normalizedPath === '/') {
        return '/'
    }

    for (const route of NON_ROOT_ROUTES) {
        if (normalizedPath === route || normalizedPath.endsWith(`${route}`)) {
            return route
        }
    }

    return null
}

export function getGatewayBasePath(pathname: string): string {
    const normalizedPath = normalizePathname(pathname)
    const currentRoute = getCurrentRoute(normalizedPath)

    if (currentRoute === null) {
        return normalizedPath === '/' ? '' : normalizedPath
    }

    if (currentRoute === '/') {
        return normalizedPath === '/' ? '' : normalizedPath
    }

    const basePath = normalizedPath.slice(0, -currentRoute.length)
    return basePath || ''
}

export function toGatewayPath(path: string, pathname: string): string {
    const basePath = getGatewayBasePath(pathname)
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    if (!basePath) {
        return normalizedPath
    }

    if (normalizedPath === '/') {
        return `${basePath}/`
    }

    return `${basePath}${normalizedPath}`
}

export function toGatewayRouteHref(
    route: AllowedRoute,
    pathname: string
): string {
    if (route === '/') {
        return toGatewayPath('/', pathname)
    }

    return toGatewayPath(`${route}/`, pathname)
}

export const TOKEN_EXPIRED_SKEW_MS = 5000
