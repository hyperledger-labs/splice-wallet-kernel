import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
} from '@mui/material'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import { useState } from 'react'
import type { SessionInfo } from '../walletkit'
import { BalanceCard } from '../components/BalanceCard.tsx'

interface Wallet {
    partyId: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
    status: string
    primary: boolean
}

interface DashboardPageProps {
    wallets: Wallet[]
    sessions: SessionInfo[]
    onPair: (uri: string) => Promise<void>
    onSessionDisconnect: (topic: string) => Promise<void>
    onSetPrimaryWallet?: (partyId: string) => void
    onRefreshSessions: () => void
}

export function DashboardPage({
    wallets,
    sessions,
    onPair,
    onSessionDisconnect,
    onSetPrimaryWallet,
}: DashboardPageProps) {
    const [walletConnectUri, setWalletConnectUri] = useState('')
    const [pairing, setPairing] = useState(false)
    const [pairError, setPairError] = useState<string | null>(null)

    const handlePair = async () => {
        if (!walletConnectUri.trim()) return
        setPairing(true)
        setPairError(null)
        try {
            await onPair(walletConnectUri.trim())
            setWalletConnectUri('')
        } catch (err) {
            setPairError(err instanceof Error ? err.message : String(err))
        } finally {
            setPairing(false)
        }
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        WalletConnect Pairing
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Paste WalletConnect URI (wc:...)"
                            value={walletConnectUri}
                            onChange={(e) =>
                                setWalletConnectUri(e.target.value)
                            }
                            onKeyDown={(e) => e.key === 'Enter' && handlePair()}
                        />
                        <Button
                            variant="contained"
                            onClick={handlePair}
                            disabled={pairing || !walletConnectUri.trim()}
                        >
                            {pairing ? (
                                <CircularProgress size={20} />
                            ) : (
                                'Connect'
                            )}
                        </Button>
                    </Box>
                    {pairError && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                            {pairError}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Wallets
                    </Typography>
                    {wallets.length === 0 ? (
                        <Typography color="text.secondary">
                            No wallets configured
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                            }}
                        >
                            {wallets.map((w) => (
                                <BalanceCard
                                    key={w.partyId}
                                    wallet={w}
                                    onSetPrimary={onSetPrimaryWallet}
                                />
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Active Sessions
                    </Typography>
                    {sessions.length === 0 ? (
                        <Typography color="text.secondary">
                            No active WalletConnect sessions
                        </Typography>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>dApp</TableCell>
                                        <TableCell>Topic</TableCell>
                                        <TableCell>Expires</TableCell>
                                        <TableCell align="right">
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sessions.map((s) => (
                                        <TableRow key={s.topic}>
                                            <TableCell>
                                                <Chip
                                                    label={s.peerName}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    fontFamily="monospace"
                                                    fontSize={11}
                                                >
                                                    {s.topic.slice(0, 16)}...
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(
                                                    s.expiry * 1000
                                                ).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() =>
                                                        onSessionDisconnect(
                                                            s.topic
                                                        )
                                                    }
                                                    title="Disconnect"
                                                >
                                                    <LinkOffIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    )
}
