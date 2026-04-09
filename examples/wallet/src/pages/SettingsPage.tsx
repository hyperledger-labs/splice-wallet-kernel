import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
} from '@mui/material'

interface Wallet {
    partyId: string
    networkId: string
    signingProviderId: string
    status: string
    primary: boolean
    disabled?: boolean
    reason?: string
}

interface SettingsPageProps {
    wallets: Wallet[]
    onRefresh: () => void
}

export function SettingsPage({ wallets }: SettingsPageProps) {
    const gatewayUrl =
        import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3030'

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Gateway Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Gateway URL: <strong>{gatewayUrl}</strong>
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                    >
                        Configured via <code>VITE_GATEWAY_URL</code> environment
                        variable.
                    </Typography>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Wallets & Signing Providers
                    </Typography>
                    {wallets.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Party ID</TableCell>
                                        <TableCell>Network</TableCell>
                                        <TableCell>Signing Provider</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {wallets.map((w) => (
                                        <TableRow
                                            key={w.partyId}
                                            sx={
                                                w.disabled
                                                    ? { opacity: 0.5 }
                                                    : undefined
                                            }
                                        >
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                        fontSize={11}
                                                    >
                                                        {w.partyId.length > 40
                                                            ? `${w.partyId.slice(0, 20)}...${w.partyId.slice(-16)}`
                                                            : w.partyId}
                                                    </Typography>
                                                    {w.primary && (
                                                        <Chip
                                                            label="primary"
                                                            size="small"
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>{w.networkId}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={w.signingProviderId}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    {w.disabled ? (
                                                        <Chip
                                                            label="disabled"
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                        />
                                                    ) : (
                                                        <Chip
                                                            label={w.status}
                                                            size="small"
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    {w.reason && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            {w.reason}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography color="text.secondary">
                            No wallets configured in the gateway.
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Box>
    )
}
