import { createFileRoute } from '@tanstack/react-router'
import { Box, Typography } from '@mui/material'
import { RegistrySettings } from '../components/registry-settings'

export const Route = createFileRoute('/settings')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Settings
            </Typography>

            <RegistrySettings />
        </Box>
    )
}
