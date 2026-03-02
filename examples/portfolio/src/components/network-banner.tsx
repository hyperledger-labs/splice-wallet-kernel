import { Box, Typography } from '@mui/material'
import { useConnection } from '../contexts/ConnectionContext'

export const NetworkBanner = () => {
    const { status } = useConnection()
    const networkId = status?.network?.networkId

    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                width: '100%',
                backgroundColor: 'grey.900',
                py: 0.5,
                textAlign: 'center',
                zIndex: (theme) => theme.zIndex.appBar + 1,
            }}
        >
            <Typography variant="caption" sx={{ color: 'grey.400' }}>
                {networkId
                    ? `Network: ${networkId}`
                    : 'Not Connected to a Network'}
            </Typography>
        </Box>
    )
}
