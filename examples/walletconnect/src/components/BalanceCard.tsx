import { Box, Typography, Chip, Button } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarOutlineIcon from '@mui/icons-material/StarOutline'

interface Wallet {
    partyId: string
    signingProviderId: string
    status: string
    primary: boolean
    disabled?: boolean
}

interface BalanceCardProps {
    wallet: Wallet
    onSetPrimary?: (partyId: string) => void
}

export function BalanceCard({ wallet, onSetPrimary }: BalanceCardProps) {
    const shortParty =
        wallet.partyId.length > 40
            ? `${wallet.partyId.split('::')[0]}::${wallet.partyId.split('::')[1]?.slice(0, 12)}...`
            : wallet.partyId

    return (
        <Box
            sx={{
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                opacity: wallet.disabled ? 0.5 : 1,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                    variant="subtitle2"
                    fontFamily="monospace"
                    fontSize={12}
                    sx={{ flexGrow: 1 }}
                >
                    {shortParty}
                </Typography>
                <Chip
                    label={wallet.signingProviderId}
                    size="small"
                    variant="outlined"
                />
                <Chip label={wallet.status} size="small" variant="outlined" />
                {wallet.primary ? (
                    <Chip
                        icon={<StarIcon />}
                        label="Primary"
                        size="small"
                        color="success"
                        variant="outlined"
                    />
                ) : (
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<StarOutlineIcon />}
                        onClick={() => onSetPrimary?.(wallet.partyId)}
                        disabled={wallet.disabled}
                    >
                        Set Primary
                    </Button>
                )}
            </Box>
        </Box>
    )
}
