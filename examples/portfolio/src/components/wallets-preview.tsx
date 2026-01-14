import { Box, Typography } from '@mui/material'
import { useAccounts } from '../hooks/useAccounts'
import { WalletPreview } from './wallet-preview'

export const WalletsPreview = () => {
    const wallets = useAccounts()
    console.log(wallets)

    return (
        <Box sx={{ mt: 1 }}>
            <Typography
                variant="h6"
                sx={{ textTransform: 'uppercase', mb: 2 }}
                fontWeight="bold"
            >
                Wallets
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                }}
            >
                {wallets.map((w) => (
                    <WalletPreview
                        key={w.partyId}
                        partyId={w.partyId}
                        walletName={w.hint}
                    />
                ))}
            </Box>
        </Box>
    )
}
