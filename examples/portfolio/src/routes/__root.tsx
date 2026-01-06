import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
    shellComponent: RootComponent,
})

function RootComponent() {
    return (
        <>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    )
}
