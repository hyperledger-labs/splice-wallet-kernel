import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
} from '@mui/material'
import { useState } from 'react'
import type { PendingRequest } from '../walletkit'

interface RequestApprovalModalProps {
    request: PendingRequest | null
    onAction: (action: 'approve' | 'reject') => Promise<void>
}

function summarizeParams(method: string, params: unknown): string {
    if (!params || typeof params !== 'object') return JSON.stringify(params)

    const p = params as Record<string, unknown>

    if (method === 'prepareSignExecute') {
        const commands = p.commands as Record<string, unknown> | undefined
        if (commands) {
            const cmdType = Object.keys(commands)[0] ?? 'Unknown'
            const cmd = commands[cmdType] as Record<string, unknown> | undefined
            const choice = (cmd?.choice as string) ?? ''
            const templateId = (cmd?.templateId as string) ?? ''
            const shortTemplate = templateId.split(':').pop() ?? templateId
            return `${cmdType} / ${choice} on ${shortTemplate}`
        }
    }

    return JSON.stringify(params).slice(0, 200)
}

export function RequestApprovalModal({
    request,
    onAction,
}: RequestApprovalModalProps) {
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
        <Dialog open={!!request} maxWidth="sm" fullWidth>
            <DialogTitle>Transaction Request</DialogTitle>
            {request && (
                <DialogContent>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 2,
                        }}
                    >
                        <Chip label={request.peerName} size="small" />
                        <Typography variant="body2" color="text.secondary">
                            requests
                        </Typography>
                        <Chip
                            label={request.method}
                            size="small"
                            color="warning"
                            variant="outlined"
                        />
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                        Summary
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: 12 }}
                    >
                        {summarizeParams(request.method, request.params)}
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Raw Parameters
                        </Typography>
                        <Box
                            component="pre"
                            sx={{
                                mt: 0.5,
                                p: 1,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                fontSize: 11,
                                maxHeight: 200,
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}
                        >
                            {JSON.stringify(request.params, null, 2)}
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
                    color="success"
                >
                    Sign & Submit
                </Button>
            </DialogActions>
        </Dialog>
    )
}
