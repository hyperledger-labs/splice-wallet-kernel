import { useState, useCallback } from 'react'
import {
    AppBar,
    Toolbar,
    Typography,
    Container,
    Tabs,
    Tab,
    Box,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { NetworkSelectModal } from './components/NetworkSelectModal.tsx'
import { SessionProposalModal } from './components/SessionProposalModal.tsx'
import { RequestApprovalModal } from './components/RequestApprovalModal.tsx'
import { useWalletKit } from './hooks/useWalletKit.ts'

export default function App() {
    const [tab, setTab] = useState(0)
    const [gatewayOpen, setGatewayOpen] = useState(false)
    const wk = useWalletKit()

    const gatewayUrl =
        (import.meta.env.VITE_GATEWAY_URL as string)?.replace(/\/$/, '') ||
        'http://localhost:3030'

    const openGateway = useCallback(() => setGatewayOpen(true), [])
    const closeGateway = useCallback(() => {
        setGatewayOpen(false)
        wk.refreshWallets()
    }, [wk])

    const handleProposalAction = async (action: 'approve' | 'reject') => {
        if (!wk.proposal) return
        if (action === 'approve') {
            const networkId =
                wk.selectedNetwork || wk.proposal.chains[0] || 'canton:devnet'
            await wk.approveProposal(wk.proposal.id, networkId)
        } else {
            await wk.rejectProposal(wk.proposal.id)
        }
    }

    const handleRequestAction = async (action: 'approve' | 'reject') => {
        if (!wk.pendingRequest) return
        if (action === 'approve') {
            await wk.approveRequest(wk.pendingRequest.id)
        } else {
            await wk.rejectRequest(wk.pendingRequest.id)
        }
    }

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <AccountBalanceWalletIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Canton Wallet
                    </Typography>
                    <Tooltip title="Gateway Account Manager">
                        <IconButton
                            color="inherit"
                            size="small"
                            onClick={openGateway}
                        >
                            <OpenInNewIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Chip
                        label={
                            wk.ready
                                ? 'WalletKit Ready'
                                : wk.authenticated
                                  ? 'Initializing...'
                                  : 'Not Connected'
                        }
                        color={wk.ready ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                    />
                </Toolbar>
            </AppBar>

            <Container maxWidth="md" sx={{ mt: 2 }}>
                {wk.authenticated ? (
                    <>
                        <Box
                            sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                                mb: 2,
                            }}
                        >
                            <Tabs
                                value={tab}
                                onChange={(_, v: number) => setTab(v)}
                            >
                                <Tab label="Dashboard" />
                                <Tab label="Settings" />
                            </Tabs>
                        </Box>

                        {tab === 0 && (
                            <DashboardPage
                                wallets={wk.wallets}
                                sessions={wk.sessions}
                                onPair={wk.pair}
                                onSessionDisconnect={wk.disconnectSession}
                                onSetPrimaryWallet={wk.setPrimaryWallet}
                                onRefreshSessions={wk.refreshSessions}
                            />
                        )}
                        {tab === 1 && (
                            <SettingsPage
                                wallets={wk.wallets}
                                onRefresh={wk.refreshWallets}
                            />
                        )}
                    </>
                ) : null}
            </Container>

            <NetworkSelectModal
                open={!wk.authenticated}
                networks={wk.networks}
                onSelect={wk.connectToNetwork}
            />

            <SessionProposalModal
                proposal={wk.proposal}
                onAction={handleProposalAction}
            />

            <RequestApprovalModal
                request={wk.pendingRequest}
                onAction={handleRequestAction}
            />

            <Dialog
                open={gatewayOpen}
                onClose={closeGateway}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                    Gateway Account Manager
                    <IconButton onClick={closeGateway} sx={{ ml: 'auto' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0, height: '75vh' }}>
                    {gatewayOpen && (
                        <iframe
                            src={gatewayUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
