import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Chip,
    Box,
    Link,
} from '@mui/material'
import { useState } from 'react'
import type { PendingProposal as Proposal } from '../walletkit'

interface SessionProposalModalProps {
    proposal: Proposal | null
    onAction: (action: 'approve' | 'reject') => Promise<void>
}

export function SessionProposalModal({
    proposal,
    onAction,
}: SessionProposalModalProps) {
    const [loading, setLoading] = useState(false)

    const handleAction = async (action: 'approve' | 'reject') => {
        setLoading(true)
        try {
            await onAction(action)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={!!proposal} maxWidth="sm" fullWidth>
            <DialogTitle>Session Request</DialogTitle>
            {proposal && (
                <DialogContent>
                    <Typography variant="subtitle1" gutterBottom>
                        <strong>{proposal.peerName}</strong> wants to connect
                    </Typography>
                    {proposal.peerUrl && (
                        <Link
                            href={proposal.peerUrl}
                            target="_blank"
                            rel="noopener"
                            variant="body2"
                        >
                            {proposal.peerUrl}
                        </Link>
                    )}
                    {proposal.peerDescription && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1 }}
                        >
                            {proposal.peerDescription}
                        </Typography>
                    )}

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Requested Methods
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 0.5,
                                flexWrap: 'wrap',
                                mt: 0.5,
                            }}
                        >
                            {proposal.methods.map((m) => (
                                <Chip
                                    key={m}
                                    label={m}
                                    size="small"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Chains
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {proposal.chains.map((c) => (
                                <Chip
                                    key={c}
                                    label={c}
                                    size="small"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
            )}
            <DialogActions>
                <Button
                    onClick={() => handleAction('reject')}
                    disabled={loading}
                    color="error"
                >
                    Reject
                </Button>
                <Button
                    onClick={() => handleAction('approve')}
                    disabled={loading}
                    variant="contained"
                >
                    Approve
                </Button>
            </DialogActions>
        </Dialog>
    )
}
