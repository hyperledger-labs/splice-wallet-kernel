// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import CloseIcon from '@mui/icons-material/Close'
import {
    Box,
    CircularProgress,
    Dialog,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from '@mui/material'
import { useForm, type AnyFieldApi } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { CopyableIdentifier } from '@components/copyable-identifier'
import { PillButton } from '@components/ui/PillButton'
import { useConnection } from '@contexts/ConnectionContext'
import { usePrimaryAccount } from '@hooks/useAccounts'
import { useWalletSdk } from '@hooks/useWalletSdk'
import { submitViaProvider } from '@lib/submit'

interface DevNetTapDialogProps {
    open: boolean
    onClose: () => void
}

const amountValidator = z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine((value) => {
        return Number(value) > 0
    }, 'Amount must be a positive number')

const defaultValues = {
    amount: '100',
}

export function DevNetTapDialog({ open, onClose }: DevNetTapDialogProps) {
    const sessionToken = useConnection().status?.session?.accessToken
    const primaryParty = usePrimaryAccount()?.partyId
    const { sdk } = useWalletSdk()

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value: formData }) => {
            if (!sessionToken) {
                toast.error('Wallet session is unavailable')
                return
            }
            if (!primaryParty) {
                toast.error('Primary wallet is unavailable')
                return
            }
            if (!sdk) {
                toast.error('Wallet SDK is unavailable')
                return
            }

            try {
                await submitViaProvider(
                    await sdk.amulet.tap(primaryParty, formData.amount),
                    primaryParty
                )
                toast.success('Tap successful')
                form.reset()
                onClose()
            } catch (error) {
                toast.error(
                    `Tap failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                )
            }
        },
    })

    const disabled = !sessionToken || !primaryParty || !sdk

    const handleClose = () => {
        if (!form.state.isSubmitting) {
            onClose()
        }
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth={false}
            slotProps={{
                paper: {
                    sx: {
                        width: 'min(100%, 640px)',
                        bgcolor: 'background.paper',
                        backgroundImage: 'none',
                        borderRadius: 1,
                        boxShadow: 24,
                        color: 'text.primary',
                    },
                },
                backdrop: {
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.64)',
                        backdropFilter: 'blur(2px)',
                    },
                },
            }}
        >
            <Box
                component="form"
                onSubmit={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    void form.handleSubmit()
                }}
                sx={{ px: 3, pt: 3, pb: 3 }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 3,
                        mb: 3,
                    }}
                >
                    <Typography variant="h4" component="h2">
                        DevNet tap
                    </Typography>
                    <IconButton
                        aria-label="Close DevNet tap dialog"
                        onClick={handleClose}
                        disabled={form.state.isSubmitting}
                        sx={{
                            color: 'secondary.main',
                            mt: 0.25,
                            '&:active': { transform: 'scale(0.97)' },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'grid', gap: 3 }}>
                    <FieldBlock label="Wallet address">
                        {primaryParty ? (
                            <CopyableIdentifier
                                value={primaryParty}
                                maxLength={36}
                            />
                        ) : (
                            <Typography color="text.secondary">
                                No primary wallet connected
                            </Typography>
                        )}
                    </FieldBlock>

                    <FieldBlock label="Instrument">
                        <TextField
                            value="Amulet"
                            disabled
                            fullWidth
                            slotProps={{
                                htmlInput: { 'aria-label': 'Instrument' },
                            }}
                            sx={textFieldSx}
                        />
                    </FieldBlock>

                    <form.Field
                        name="amount"
                        validators={{
                            onChange: amountValidator,
                            onSubmit: amountValidator,
                        }}
                    >
                        {(field) => (
                            <FieldBlock label="Amount">
                                <TextField
                                    type="number"
                                    value={field.state.value}
                                    onChange={(event) =>
                                        field.handleChange(event.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    disabled={disabled}
                                    error={hasFieldError(field)}
                                    helperText={
                                        hasFieldError(field)
                                            ? getFieldError(field)
                                            : undefined
                                    }
                                    fullWidth
                                    slotProps={{
                                        htmlInput: {
                                            'aria-label': 'Amount',
                                        },
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    AMT
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    sx={textFieldSx}
                                />
                            </FieldBlock>
                        )}
                    </form.Field>

                    <form.Subscribe
                        selector={(state) => ({
                            canSubmit: state.canSubmit,
                            isSubmitting: state.isSubmitting,
                        })}
                    >
                        {({ canSubmit, isSubmitting }) => (
                            <PillButton
                                type="submit"
                                fullWidth
                                disabled={
                                    !canSubmit || isSubmitting || disabled
                                }
                                sx={{ mt: 0.5, minHeight: 48 }}
                            >
                                {isSubmitting ? (
                                    <CircularProgress
                                        size={24}
                                        color="inherit"
                                    />
                                ) : (
                                    'Tap'
                                )}
                            </PillButton>
                        )}
                    </form.Subscribe>
                </Box>
            </Box>
        </Dialog>
    )
}

interface FieldBlockProps {
    label: string
    children: React.ReactNode
}

const FieldBlock: React.FC<FieldBlockProps> = ({ label, children }) => (
    <Box>
        <Typography
            sx={{
                mb: 0.75,
                color: 'text.primary',
                fontWeight: 800,
                textTransform: 'uppercase',
            }}
        >
            {label}
        </Typography>
        {children}
    </Box>
)

const controlBaseSx: SxProps<Theme> = {
    minHeight: 48,
    bgcolor: (theme) => theme.portfolio.surface.required,
    color: 'text.primary',
    borderRadius: 1,
    '& fieldset': { border: 'none' },
    '&:hover fieldset': { border: 'none' },
    '&.Mui-focused fieldset': (theme) => ({
        border: `1px solid ${theme.palette.secondary.main}`,
    }),
    '&.Mui-disabled': {
        bgcolor: 'action.disabledBackground',
    },
}

const textFieldSx: SxProps<Theme> = {
    '& .MuiInputBase-root': controlBaseSx,
    '& .MuiInputBase-input': {
        px: 2.5,
        py: 1.25,
        '&::placeholder': {
            color: 'text.disabled',
            opacity: 1,
        },
    },
    '& .MuiInputAdornment-root .MuiTypography-root': {
        color: 'text.primary',
    },
    '& .MuiFormHelperText-root': {
        ml: 0,
        mt: 1,
        color: 'text.secondary',
        fontSize: 14,
    },
}

const hasFieldError = (field: AnyFieldApi) =>
    field.state.meta.isTouched && field.state.meta.errors.length > 0

const getFieldError = (field: AnyFieldApi) => {
    if (!hasFieldError(field)) return undefined
    return String(field.state.meta.errors[0].message)
}
