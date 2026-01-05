import { StrictMode } from 'react'
import './index.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import ReactDOM from 'react-dom/client'

import { RegistryServiceProvider } from './contexts/RegistriesServiceProvider'
import { ConnectionProvider } from './contexts/ConnectionProvider'
import { PortfolioProvider } from './contexts/PortfolioProvider'

const router = createRouter({
    routeTree,
    context: {},
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

// Render the app
const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <RegistryServiceProvider>
                <ConnectionProvider>
                    <PortfolioProvider>
                        <RouterProvider router={router} />
                    </PortfolioProvider>
                </ConnectionProvider>
            </RegistryServiceProvider>
        </StrictMode>
    )
}
