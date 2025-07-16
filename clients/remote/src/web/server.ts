import express from 'express'

export const web = express()

// Middleware to ensure all paths end with a trailing slash
// This is useful for static file serving and routing consistency
web.use((req, res, next) => {
    if (
        req.method !== 'GET' ||
        req.path.length <= 1 || // Skip root path
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

        if (redirectUrl.origin === `${req.protocol}://${req.headers.host}`) {
            res.redirect(301, req.path + '/' + query) // Redirect with 301 (Permanent Redirect)
        } else {
            next() // Skip redirection if origin check fails
        }
    } catch {
        // Skip if the URL construction fails
        next()
    }
})
