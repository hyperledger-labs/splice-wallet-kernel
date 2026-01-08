import { Box, Typography } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    return (
        <Box sx={{ my: 8 }}>
            <Typography variant="h3" component="h1" sx={{ mb: 6 }}>
                Dashboard
            </Typography>
            {/* <ActionRequired items={actionItems} /> */}
            {/* <WalletsPreview /> */}
        </Box>
    )
}
