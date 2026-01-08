import React, { useState } from 'react'
import {
    Box,
    Paper,
    Typography,
    Button,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material'
import { CopyableIdentifier } from './copyable-identifier'

interface ActionItem {
    id: string
    tag: string
    type: string
    date: string
    expiry: string
    message: string
    sender: string
    receiver: string
    currentPartyId: string
    instrumentId: string
    amount: string
}

interface ActionRequiredProps {
    items: ActionItem[]
}

export const ActionRequired: React.FC<ActionRequiredProps> = ({ items }) => {
    const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleCardClick = (item: ActionItem) => {
        setSelectedItem(item)
        setIsDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setIsDialogOpen(false)
        setSelectedItem(null)
    }

    const isReceiver = (item: ActionItem) => {
        return item.currentPartyId === item.receiver
    }

    const getCounterparty = (item: ActionItem) => {
        if (isReceiver(item)) {
            return { label: 'Sender', value: item.sender }
        }
        return { label: 'Receiver', value: item.receiver }
    }

    if (items.length === 0) return null

    return (
        <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', mb: 2 }}>
                <Typography
                    variant="h6"
                    sx={{ textTransform: 'uppercase' }}
                    fontWeight="bold"
                >
                    Action Required
                </Typography>
                <Badge
                    badgeContent={items.length}
                    color="error"
                    sx={{ ml: 2 }}
                />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map((item) => (
                    <Paper
                        key={item.id}
                        elevation={1}
                        variant="elevation"
                        sx={{
                            p: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRadius: 0,
                            gap: 2,
                            cursor: 'pointer',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                            },
                        }}
                        onClick={() => handleCardClick(item)}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                            }}
                        >
                            <Box sx={{ minWidth: 120, flexShrink: 0 }}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >
                                    Type
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">
                                    {item.type}
                                </Typography>
                            </Box>

                            <Box sx={{ minWidth: 80, flexShrink: 0 }}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >
                                    Amount
                                </Typography>
                                <Typography variant="body1">
                                    {item.amount} {item.instrumentId}
                                </Typography>
                            </Box>

                            <Box sx={{ minWidth: 100, flexShrink: 0 }}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >
                                    Expires
                                </Typography>
                                <Typography variant="body1">
                                    {item.expiry}
                                </Typography>
                            </Box>

                            <Box sx={{ minWidth: 100, flexShrink: 0 }}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >
                                    {getCounterparty(item).label}
                                </Typography>
                                {/* <Typography variant="body1"> */}
                                <CopyableIdentifier
                                    value={getCounterparty(item).value}
                                />
                                {/* </Typography> */}
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 150 }}>
                                <Typography
                                    variant="body2"
                                    color="textSecondary"
                                >
                                    Message
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{ wordBreak: 'break-word' }}
                                >
                                    {item.message.slice(0, 30) + '...'}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {isReceiver(item) ? (
                                <>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        sx={{ minWidth: 80 }}
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        sx={{ minWidth: 80 }}
                                    >
                                        Reject
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    size="small"
                                    sx={{ minWidth: 80 }}
                                >
                                    Withdraw
                                </Button>
                            )}
                        </Box>
                    </Paper>
                ))}
            </Box>

            <Dialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" component="div" fontWeight="bold">
                        Action Details
                    </Typography>
                    {/* <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}> */}
                    {/*   {selectedItem?.type} */}
                    {/* </Typography> */}
                </DialogTitle>
                <DialogContent sx={{ py: 2 }}>
                    {selectedItem && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 3,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 3,
                                    p: 2,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        Amount
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        {selectedItem.amount}{' '}
                                        {selectedItem.instrumentId}
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        Type
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight="medium"
                                        >
                                            Transfer Offer
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 3,
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                            mb: 1,
                                            display: 'block',
                                        }}
                                    >
                                        Created
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        fontWeight="medium"
                                    >
                                        {selectedItem.date}
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                            mb: 1,
                                            display: 'block',
                                        }}
                                    >
                                        Expires
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        fontWeight="medium"
                                    >
                                        {selectedItem.expiry}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        mb: 1,
                                        display: 'block',
                                    }}
                                >
                                    {getCounterparty(selectedItem).label}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <CopyableIdentifier
                                        value={
                                            getCounterparty(selectedItem).value
                                        }
                                        maxLength={60}
                                    />
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        mb: 1,
                                        display: 'block',
                                    }}
                                >
                                    Message
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        wordBreak: 'break-word',
                                        lineHeight: 1.6,
                                        color: 'text.primary',
                                    }}
                                >
                                    {selectedItem.message}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        mb: 1,
                                        display: 'block',
                                    }}
                                >
                                    Contract ID
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <CopyableIdentifier
                                        value={selectedItem.id}
                                        maxLength={60}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
                    <Button
                        onClick={handleCloseDialog}
                        variant="outlined"
                        color="inherit"
                        sx={{ minWidth: 100 }}
                    >
                        Cancel
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    {selectedItem && isReceiver(selectedItem) ? (
                        <>
                            <Button
                                variant="outlined"
                                color="error"
                                sx={{ minWidth: 100 }}
                            >
                                Reject
                            </Button>
                            <Button variant="contained" sx={{ minWidth: 100 }}>
                                Accept
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outlined"
                            color="warning"
                            sx={{ minWidth: 100 }}
                        >
                            Withdraw
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    )
}
