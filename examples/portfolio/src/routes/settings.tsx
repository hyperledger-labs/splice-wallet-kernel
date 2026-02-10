import { createFileRoute } from '@tanstack/react-router'
import { Box, Typography } from '@mui/material'
import { RegistrySettings } from '../components/registry-settings'
import { TapSettings } from '../components/tap-settings'
import { useIsDevNet } from '../hooks/useIsDevNet'

export const Route = createFileRoute('/settings')({
    component: RouteComponent,
})

function RouteComponent() {
    const { data: isDevNet } = useIsDevNet()

    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Settings
            </Typography>

            <RegistrySettings />
            {isDevNet && <TapSettings />}
        </Box>
    )
}
