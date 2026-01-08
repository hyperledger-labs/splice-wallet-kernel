import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Header } from '../components/header'
import { Container } from '@mui/material'
import type { QueryClient } from '@tanstack/react-query'

export interface RouterContext {
    queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
    shellComponent: RootComponent,
})

function RootComponent() {
    return (
        <>
            <Container maxWidth="lg">
                <Header />
                <Outlet />
                <TanStackRouterDevtools />
            </Container>
        </>
    )
}
