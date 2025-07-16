import express from 'express'

export const web = express()

// Middleware to ensure all paths end with a trailing slash
// This is useful for static file serving and routing consistency
web.use((req, res, next) => {
    // Check if the path is not the root and does not end with a slash
    if (
        req.method === 'GET' &&
        req.path.length > 1 &&
        !req.path.includes('.') && // Ignore paths with file extensions
        !req.path.includes('@vite') && // Ignore Vite dev server paths
        !req.path.endsWith('/')
    ) {
        const query = req.url.slice(req.path.length) // Preserve query parameters
        // Ensure the path is valid and local
        try {
            const redirectUrl = new URL(req.path + '/', `http://${req.headers.host}`);
            if (redirectUrl.origin === `http://${req.headers.host}`) {
                res.redirect(301, req.path + '/' + query); // Redirect with 301 (Permanent Redirect)
            } else {
                next(); // Skip redirection if validation fails
            }
        } catch (e) {
            next(); // Skip redirection if URL construction fails
        }
    } else {
        next() // Continue to the next middleware or route handler
    }
})
