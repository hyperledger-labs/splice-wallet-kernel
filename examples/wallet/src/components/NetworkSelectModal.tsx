import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItemButton,
    ListItemText,
    CircularProgress,
    Typography,
    Alert,
} from '@mui/material'
import { useState } from 'react'
import type { NetworkInfo } from '../walletkit'

interface NetworkSelectModalProps {
    open: boolean
    networks: NetworkInfo[]
    onSelect: (networkId: string) => Promise<void>
}

export function NetworkSelectModal({
    open,
    networks,
    onSelect,
}: NetworkSelectModalProps) {
    const [connecting, setConnecting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleSelect = async (networkId: string) => {
        setConnecting(networkId)
        setError(null)
        try {
            await onSelect(networkId)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
            setConnecting(null)
        }
    }

    return (
        <Dialog open={open} maxWidth="xs" fullWidth>
            <DialogTitle>Select Network</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {networks.length === 0 ? (
                    <Typography color="text.secondary">
                        Loading networks...
                    </Typography>
                ) : (
                    <List>
                        {networks.map((n) => (
                            <ListItemButton
                                key={n.id}
                                onClick={() => handleSelect(n.id)}
                                disabled={connecting !== null}
                            >
                                <ListItemText
                                    primary={n.name}
                                    secondary={n.id}
                                />
                                {connecting === n.id && (
                                    <CircularProgress
                                        size={20}
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    )
}
