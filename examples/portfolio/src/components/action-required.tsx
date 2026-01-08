import React, { useState } from 'react'
import {
    Box,
    Paper,
    Typography,
    Button,
    Badge,
    CircularProgress,
} from '@mui/material'
import type { PartyId } from '@canton-network/core-types'
import { toast } from 'sonner'
import { CopyableIdentifier } from './copyable-identifier'
import { useExerciseTransfer } from '../hooks/useExerciseTransfer'
import { ActionRequiredDialog } from './action-required-dialog'
import type { ActionItem } from './types'
import { getCounterparty, isReceiver } from './utils'

interface ActionRequiredProps {
    items: ActionItem[]
}

export const ActionRequired: React.FC<ActionRequiredProps> = ({ items }) => {
    const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null)

    const exerciseTransferMutation = useExerciseTransfer()

    const handleCardClick = (item: ActionItem) => {
        setSelectedItem(item)
        setIsDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setIsDialogOpen(false)
        setSelectedItem(null)
    }

    const handleAction = (
        item: ActionItem,
        action: 'Accept' | 'Reject' | 'Withdraw'
    ) => {
        setLoadingItemId(item.id)
        exerciseTransferMutation.mutate(
            {
                party: item.currentPartyId as PartyId,
                contractId: item.id,
                instrumentId: item.instrumentId,
                instructionChoice: action,
            },
            {
                onSuccess: () => handleCloseDialog(),
                onError: (error) =>
                    toast.error(
                        `Failed to ${action.toLowerCase()} transfer: ${error instanceof Error ? error.message : 'Unknown error'}`
                    ),
                onSettled: () => setLoadingItemId(null),
            }
        )
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
                {items.map((item) => {
                    const isItemLoading = loadingItemId === item.id

                    return (
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
                                cursor: isItemLoading ? 'default' : 'pointer',
                                opacity: isItemLoading ? 0.7 : 1,
                                '&:hover': {
                                    backgroundColor: isItemLoading
                                        ? 'inherit'
                                        : 'action.hover',
                                },
                            }}
                            onClick={() =>
                                !isItemLoading && handleCardClick(item)
                            }
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
                                    <Typography
                                        variant="body1"
                                        fontWeight="medium"
                                    >
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
                                        {item.amount} {item.instrumentId.id}
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
                                    <CopyableIdentifier
                                        value={getCounterparty(item).value}
                                    />
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
                                            disabled={isItemLoading}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleAction(item, 'Accept')
                                            }}
                                        >
                                            {isItemLoading ? (
                                                <CircularProgress
                                                    size={16}
                                                    color="inherit"
                                                />
                                            ) : (
                                                'Accept'
                                            )}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            sx={{ minWidth: 80 }}
                                            disabled={isItemLoading}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleAction(item, 'Reject')
                                            }}
                                        >
                                            {isItemLoading ? (
                                                <CircularProgress
                                                    size={16}
                                                    color="inherit"
                                                />
                                            ) : (
                                                'Reject'
                                            )}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                        sx={{ minWidth: 80 }}
                                        disabled={isItemLoading}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAction(item, 'Withdraw')
                                        }}
                                    >
                                        {isItemLoading ? (
                                            <CircularProgress
                                                size={16}
                                                color="inherit"
                                            />
                                        ) : (
                                            'Withdraw'
                                        )}
                                    </Button>
                                )}
                            </Box>
                        </Paper>
                    )
                })}
            </Box>

            <ActionRequiredDialog
                item={selectedItem}
                open={isDialogOpen}
                isLoading={loadingItemId !== null}
                onClose={handleCloseDialog}
                onAccept={(selectedItem) =>
                    handleAction(selectedItem, 'Accept')
                }
                onReject={(selectedItem) =>
                    handleAction(selectedItem, 'Reject')
                }
                onWithdraw={(selectedItem) =>
                    handleAction(selectedItem, 'Withdraw')
                }
            />
        </Box>
    )
}
