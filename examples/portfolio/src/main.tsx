import { StrictMode } from 'react'
import './index.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import ReactDOM from 'react-dom/client'

import { RegistryServiceProvider } from './contexts/RegistriesServiceProvider'
import { ConnectionProvider } from './contexts/ConnectionProvider'
import { PortfolioProvider } from './contexts/PortfolioProvider'
import { AppThemeProvider } from './contexts/theme-provider'
import { Toaster } from 'sonner'

const queryClient = new QueryClient()

const router = createRouter({
    routeTree,
    context: { queryClient },
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
            <AppThemeProvider>
                <QueryClientProvider client={queryClient}>
                    <RegistryServiceProvider>
                        <ConnectionProvider>
                            <PortfolioProvider>
                                <RouterProvider router={router} />
                                <Toaster richColors />
                            </PortfolioProvider>
                        </ConnectionProvider>
                    </RegistryServiceProvider>
                </QueryClientProvider>
            </AppThemeProvider>
        </StrictMode>
    )
}
