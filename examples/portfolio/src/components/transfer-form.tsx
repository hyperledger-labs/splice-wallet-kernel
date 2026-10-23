// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import {
    Alert,
    Box,
    CircularProgress,
    FormControlLabel,
    FormHelperText,
    IconButton,
    InputAdornment,
    Radio,
    RadioGroup,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers'
import { useForm } from '@tanstack/react-form'
import type { AnyFieldApi } from '@tanstack/react-form'
import { z } from 'zod'
import { CopyableIdentifier } from '@components/copyable-identifier'
import { PillButton } from '@components/ui/PillButton'
import { usePrimaryAccount } from '@hooks/useAccounts'
import type { useCreateTransfer } from '@hooks/useCreateTransfer'
import { useInstrumentAvailableBalance } from '@hooks/useInstrumentAvailableBalance'
import { toDecimalOrNull } from '@utils/decimal'
import { InstrumentSelect } from './instrument-select'
import type {
    SelectableInstrument,
    SubmittedTransfer,
    TransferFormData,
} from './transfer-types'

interface TransferFormProps {
    initialValues?: TransferFormData
    createTransferMutation: ReturnType<typeof useCreateTransfer>
    onClose: () => void
    onSubmitted: (transfer: SubmittedTransfer) => void
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const DESCRIPTION_LIMIT = 280

const createDefaultTransferValues = (): TransferFormData => ({
    instrumentId: null,
    amount: '',
    recipient: '',
    memo: '',
    expiry: new Date(Date.now() + SEVEN_DAYS_MS),
    tokenStandardVersion: 'v1',
})

const instrumentValidator = z
    .object({
        admin: z.string(),
        id: z.string(),
    })
    .nullable()
    .refine((value) => value !== null, 'Please select an asset')

const recipientValidator = z
    .string()
    .trim()
    .min(1, 'Recipient address is required')

const memoValidator = z
    .string()
    .max(DESCRIPTION_LIMIT, `${DESCRIPTION_LIMIT} characters maximum`)

const expiryValidator = z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Expiration date is required')
    .refine(
        (value) => value === null || !Number.isNaN(value.getTime()),
        'Expiration date must be valid'
    )
    .refine(
        (value) =>
            value === null ||
            Number.isNaN(value.getTime()) ||
            value.getTime() > Date.now(),
        'Expiration date must be in the future'
    )

export const TransferForm: React.FC<TransferFormProps> = ({
    initialValues,
    createTransferMutation,
    onClose,
    onSubmitted,
}) => {
    const primaryAccount = usePrimaryAccount()
    const primaryParty = primaryAccount?.partyId
    const [selectedInstrument, setSelectedInstrument] =
        useState<SelectableInstrument | null>(null)

    const defaultValues = useMemo(
        () => initialValues ?? createDefaultTransferValues(),
        [initialValues]
    )

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value: formData }) => {
            if (!primaryParty || !formData.instrumentId || !formData.expiry) {
                return
            }

            const instrumentId = formData.instrumentId
            const expiry = formData.expiry

            createTransferMutation.mutate(
                {
                    sender: primaryParty,
                    receiver: formData.recipient.trim(),
                    instrumentId,
                    amount: formData.amount,
                    expiry,
                    memo: formData.memo.trim() || undefined,
                    tokenStandardVersion: formData.tokenStandardVersion,
                },
                {
                    onSuccess: () => {
                        onSubmitted({
                            sender: primaryParty,
                            instrumentId,
                            instrumentSymbol: selectedInstrument?.symbol,
                            instrumentName: selectedInstrument?.name,
                            amount: formData.amount,
                            recipient: formData.recipient.trim(),
                            memo: formData.memo.trim(),
                            expiry,
                            submittedAt: new Date(),
                            tokenStandardVersion: formData.tokenStandardVersion,
                        })
                    },
                }
            )
        },
    })

    const mutationError = createTransferMutation.error
    const disabled = createTransferMutation.isPending

    const handleInstrumentChange = (
        instrument: SelectableInstrument | null
    ) => {
        setSelectedInstrument(instrument)
        form.setFieldValue('instrumentId', instrument?.instrumentId ?? null)
    }

    return (
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
                    Make a transfer
                </Typography>
                <IconButton
                    aria-label="Close transfer dialog"
                    onClick={onClose}
                    disabled={disabled}
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
                {mutationError && (
                    <Alert severity="error">
                        Transfer failed:{' '}
                        {mutationError instanceof Error
                            ? mutationError.message
                            : 'Unknown error'}
                    </Alert>
                )}

                <FieldBlock label="Wallet address">
                    {primaryParty && (
                        <CopyableIdentifier
                            value={primaryParty}
                            maxLength={24}
                        />
                    )}
                </FieldBlock>

                <form.Field
                    name="tokenStandardVersion"
                    validators={{
                        onChange: ({ value }) =>
                            value
                                ? undefined
                                : 'Token standard version is required',
                    }}
                >
                    {(field) => (
                        <FieldBlock label="Token Standard Version">
                            <RadioGroup
                                row
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(
                                        e.target
                                            .value as TransferFormData['tokenStandardVersion']
                                    )
                                }
                            >
                                <FormControlLabel
                                    value="v2"
                                    control={<Radio disabled={disabled} />}
                                    label="v1"
                                    sx={{ color: 'text.primary' }}
                                />
                                <FormControlLabel
                                    value="V2"
                                    control={<Radio disabled={disabled} />}
                                    label="V2"
                                    sx={{ color: 'text.primary' }}
                                />
                            </RadioGroup>
                            <FormHelperText error={hasFieldError(field)}>
                                {getFieldError(field) ??
                                    'Token standard version to use'}
                            </FormHelperText>
                        </FieldBlock>
                    )}
                </form.Field>

                <form.Field
                    name="recipient"
                    validators={{
                        onChange: recipientValidator,
                        onSubmit: recipientValidator,
                    }}
                >
                    {(field) => (
                        <FieldBlock label="Recipient Address">
                            <TextField
                                value={field.state.value}
                                onChange={(event) =>
                                    field.handleChange(event.target.value)
                                }
                                onBlur={field.handleBlur}
                                disabled={disabled}
                                error={hasFieldError(field)}
                                helperText={getFieldError(field)}
                                slotProps={{
                                    htmlInput: {
                                        'aria-label': 'Recipient Address',
                                    },
                                }}
                                fullWidth
                                sx={darkTextFieldSx}
                            />
                        </FieldBlock>
                    )}
                </form.Field>

                <form.Field
                    name="instrumentId"
                    validators={{
                        onChange: instrumentValidator,
                        onSubmit: instrumentValidator,
                    }}
                >
                    {(field) => (
                        <FieldBlock label="Select asset">
                            <InstrumentSelect
                                partyId={primaryParty}
                                value={field.state.value}
                                onChange={handleInstrumentChange}
                                disabled={disabled}
                                error={hasFieldError(field)}
                                helperText={getFieldError(field)}
                            />
                            <Typography
                                variant="body2"
                                sx={{ mt: 0.75, color: 'text.secondary' }}
                            >
                                Available balance:{' '}
                                {selectedInstrument
                                    ? `${selectedInstrument.availableAmount} ${selectedInstrument.symbol}`
                                    : '—'}
                            </Typography>
                        </FieldBlock>
                    )}
                </form.Field>

                <form.Subscribe selector={(state) => state.values.instrumentId}>
                    {(selectedInstrumentId) => (
                        <AmountField
                            form={form}
                            primaryParty={primaryParty}
                            selectedInstrumentId={selectedInstrumentId}
                            selectedInstrument={selectedInstrument}
                            disabled={disabled}
                        />
                    )}
                </form.Subscribe>

                <form.Field
                    name="expiry"
                    validators={{
                        onChange: expiryValidator,
                        onSubmit: expiryValidator,
                    }}
                >
                    {(field) => (
                        <FieldBlock label="Expiration date">
                            <DateTimePicker
                                ampm={false}
                                disablePast
                                value={field.state.value}
                                onChange={(date) => field.handleChange(date)}
                                disabled={disabled}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: hasFieldError(field),
                                        helperText:
                                            getFieldError(field) ??
                                            'Date the transfer offer expires',
                                        sx: darkTextFieldSx,
                                    },
                                    openPickerButton: {
                                        sx: { color: 'text.primary' },
                                    },
                                }}
                            />
                        </FieldBlock>
                    )}
                </form.Field>

                <form.Field
                    name="memo"
                    validators={{
                        onChange: memoValidator,
                        onSubmit: memoValidator,
                    }}
                >
                    {(field) => {
                        const charactersLeft = Math.max(
                            0,
                            DESCRIPTION_LIMIT - field.state.value.length
                        )

                        return (
                            <FieldBlock label="Description">
                                <TextField
                                    value={field.state.value}
                                    onChange={(event) =>
                                        field.handleChange(event.target.value)
                                    }
                                    disabled={disabled}
                                    error={hasFieldError(field)}
                                    helperText={getFieldError(field)}
                                    multiline
                                    rows={4}
                                    slotProps={{
                                        htmlInput: {
                                            'aria-label': 'Description',
                                        },
                                    }}
                                    fullWidth
                                    sx={darkTextFieldSx}
                                />
                                <Typography
                                    sx={{
                                        mt: 1,
                                        color: 'text.secondary',
                                    }}
                                >
                                    {charactersLeft} characters left
                                </Typography>
                            </FieldBlock>
                        )
                    }}
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
                                !canSubmit ||
                                isSubmitting ||
                                disabled ||
                                !primaryParty
                            }
                            sx={{ mt: 0.5, minHeight: 48 }}
                        >
                            {disabled ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Make Transfer'
                            )}
                        </PillButton>
                    )}
                </form.Subscribe>
            </Box>
        </Box>
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

interface AmountFieldProps {
    // TanStack Form's component API is difficult to name cleanly here.
    // oxlint-disable-next-line typescript/no-explicit-any
    form: any
    primaryParty: string | undefined
    selectedInstrumentId: TransferFormData['instrumentId']
    selectedInstrument: SelectableInstrument | null
    disabled: boolean
}

const AmountField: React.FC<AmountFieldProps> = ({
    form,
    primaryParty,
    selectedInstrumentId,
    selectedInstrument,
    disabled,
}) => {
    const availableHolding = useInstrumentAvailableBalance(
        primaryParty,
        selectedInstrumentId
    )
    const availableBalance = availableHolding?.availableAmount ?? '0'

    const amountValidator = useMemo(
        () =>
            z
                .string()
                .min(1, 'Amount is required')
                .refine((value) => {
                    const amount = toDecimalOrNull(value)
                    return amount?.isPositive() ?? false
                }, 'Amount must be a positive number')
                .refine((value) => {
                    if (!selectedInstrumentId) return true

                    const requested = toDecimalOrNull(value || '0')
                    const available = toDecimalOrNull(availableBalance)
                    if (!requested || !available) return false

                    return requested.lte(available)
                }, `Amount exceeds available balance of ${availableBalance}`),
        [availableBalance, selectedInstrumentId]
    )

    return (
        <form.Field
            name="amount"
            validators={{
                onChange: amountValidator,
                onSubmit: amountValidator,
            }}
        >
            {(field: AnyFieldApi) => (
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
                        helperText={getFieldError(field)}
                        slotProps={{
                            htmlInput: {
                                'aria-label': 'Amount',
                                min: 0,
                                step: 'any',
                            },
                            input: {
                                endAdornment: selectedInstrument ? (
                                    <InputAdornment position="end">
                                        <Typography
                                            sx={{ color: 'text.primary' }}
                                        >
                                            {selectedInstrument.symbol}
                                        </Typography>
                                    </InputAdornment>
                                ) : undefined,
                            },
                        }}
                        fullWidth
                        sx={darkTextFieldSx}
                    />
                </FieldBlock>
            )}
        </form.Field>
    )
}

const darkTextFieldSx: SxProps<Theme> = {
    '& .MuiInputBase-root, & .MuiPickersInputBase-root': {
        minHeight: 48,
        bgcolor: (theme) => theme.portfolio.surface.required,
        color: 'text.primary',
        borderRadius: 1,
        '& fieldset, & .MuiPickersOutlinedInput-notchedOutline': {
            border: 'none',
        },
        '&:hover fieldset, &:hover .MuiPickersOutlinedInput-notchedOutline': {
            border: 'none',
        },
    },
    '& .MuiInputBase-root.MuiInputBase-multiline': {
        p: 0,
    },
    '& .MuiInputBase-root.MuiInputBase-adornedEnd': {
        pr: 2.5,
    },
    '& .MuiInputBase-input': {
        px: 2.5,
        py: 1.25,
        '&::placeholder': {
            color: 'text.disabled',
            opacity: 1,
        },
    },
    '& .MuiPickersInputBase-root': {
        px: 2.5,
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
    return field.state.meta.errors[0]?.message
}
