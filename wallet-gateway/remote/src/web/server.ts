// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import express from 'express'
import { Server } from 'http'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import ViteExpress from 'vite-express'
import { GATEWAY_VERSION } from '../version.js'

export const web = (app: express.Express, server: Server, userPath: string) => {
    // Expose userPath via well-known configuration endpoint
    app.get('/.well-known/wallet-gateway-config', (_req, res) => {
        res.json({ userPath })
    })
    if (process.env.NODE_ENV === 'development') {
        // Enable live reloading and Vite dev server for frontend in development
        ViteExpress.bind(app, server)
    } else {
        // Serve static files from the package build in production
        app.use(
            express.static(
                path.resolve(
                    dirname(fileURLToPath(import.meta.url)),
                    '../../dist/web/frontend'
                )
            )
        )
    }

    // Expose gateway version via well-known endpoint
    app.get('/.well-known/wallet-gateway-version', (_req, res) => {
        res.json({ version: GATEWAY_VERSION })
    })

    // Middleware to ensure all paths end with a trailing slash
    // This is useful for static file serving and routing consistency
    app.use((req, res, next) => {
        if (
            req.method !== 'GET' ||
            req.path.length <= 1 || // Skip root path
            req.path.startsWith('/api') || // Ignore API routes
            req.path.endsWith('/') || // Path already ends with a slash
            req.path.includes('.') || // Ignore paths with file extensions
            req.path.includes('@vite') // Ignore Vite dev server paths
        ) {
            return next() // Skip if not a GET request or already has a trailing slash
        }

        try {
            const query = req.url.slice(req.path.length) // Preserve query parameters
            const redirectUrl = new URL(
                req.path + '/' + query,
                `${req.protocol}://${req.headers.host}`
            )

            if (
                redirectUrl.origin === `${req.protocol}://${req.headers.host}`
            ) {
                res.redirect(301, req.path + '/' + query) // Redirect with 301 (Permanent Redirect)
            } else {
                next() // Skip redirection if origin check fails
            }
        } catch {
            // Skip if the URL construction fails
            next()
        }
    })

    return app
}
