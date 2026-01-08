import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Header } from '../components/header'
import { Container } from '@mui/material'

export const Route = createRootRoute({
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
