import { Box, Avatar, Typography, Paper, Skeleton } from '@mui/material'
import {
    useWalletInstruments,
    type AggregatedInstrument,
} from '../hooks/useWalletInstruments'

interface WalletPreviewProps {
    partyId: string
    walletName: string
}

export const WalletPreview: React.FC<WalletPreviewProps> = ({
    partyId,
    walletName,
}) => {
    const { instruments, isLoading } = useWalletInstruments(partyId)
    const hasInstruments = instruments.length > 0

    const noInstruments = (
        <Box
            sx={{
                p: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
            }}
        >
            <Avatar
                sx={{ visibility: 'hidden', m: 1, height: 25, width: 25 }}
            />
            <Typography sx={{ position: 'absolute' }}>
                There are currently no assets in this wallet
            </Typography>
        </Box>
    )

    const loadingState = (
        <Box sx={{ p: 1 }}>
            <Skeleton variant="rectangular" height={40} />
            <Skeleton variant="rectangular" height={40} sx={{ mt: 1 }} />
        </Box>
    )

    const renderedAssets = instruments.map((item) => (
        <InstrumentRow
            key={`${item.instrumentId.admin}::${item.instrumentId.id}`}
            item={item}
        />
    ))

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    mb: 1,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <Typography
                    sx={{
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        maxWidth: '200px',
                    }}
                    fontWeight="bold"
                    color="secondary"
                >
                    {walletName}
                </Typography>
            </Box>
            <Box
                component={Paper}
                variant="outlined"
                sx={{
                    background: (t) =>
                        t.palette.mode === 'dark'
                            ? undefined
                            : t.palette.grey[100],
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {isLoading
                    ? loadingState
                    : hasInstruments
                      ? renderedAssets
                      : noInstruments}
            </Box>
        </Box>
    )
}

interface InstrumentRowProps {
    item: AggregatedInstrument
}

const InstrumentRow: React.FC<InstrumentRowProps> = ({ item }) => {
    const symbol = item.instrument?.symbol ?? item.instrumentId.id
    const name = item.instrument?.name ?? item.instrumentId.id
    const hasLockedAmount = item.lockedAmount !== '0'

    return (
        <Box
            borderRadius={0}
            sx={{
                '&:not(:first-of-type)': {
                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                },
                p: 1,
                display: 'flex',
                alignItems: 'center',
            }}
        >
            <Avatar sx={{ m: 1, height: 25, width: 25 }}>{symbol[0]}</Avatar>
            <Box>
                <Typography
                    sx={{
                        maxWidth: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    color="textSecondary"
                    variant="body2"
                >
                    {name}
                </Typography>
                <Typography variant="body2" fontWeight="700">
                    {item.totalAmount} {symbol}
                    {hasLockedAmount && (
                        <Typography
                            component="span"
                            variant="body2"
                            color="textSecondary"
                            sx={{ ml: 0.5 }}
                        >
                            ({item.availableAmount} available)
                        </Typography>
                    )}
                </Typography>
            </Box>
        </Box>
    )
}
