// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import CloseIcon from '@mui/icons-material/Close'
import {
    Alert,
    Box,
    CircularProgress,
    Dialog,
    IconButton,
    TextField,
    Typography,
    type SxProps,
    type Theme,
} from '@mui/material'
import { useForm, type AnyFieldApi } from '@tanstack/react-form'
import { toast } from 'sonner'
import { PillButton } from '@components/ui/PillButton'
import { registryFormSchema, type RegistryFormData } from '@lib/schemas'
import { useRegistryMutations } from '@hooks/useRegistryUrls'
import { isInsecureRegistryUrl } from '@utils/registry'

interface AddRegistryDialogProps {
    open: boolean
    onClose: () => void
}

const INSECURE_REGISTRY_URL_WARNING =
    'Registry responses can be spoofed by network attackers. Use HTTPS.'
const INSECURE_REGISTRY_URL_ADDED_WARNING =
    'Registry added, but responses can be spoofed by network attackers. Use HTTPS.'

const defaultValues: RegistryFormData = {
    partyId: '',
    registryUrl: '',
}

export function AddRegistryDialog({ open, onClose }: AddRegistryDialogProps) {
    const { setRegistryUrl } = useRegistryMutations()

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value: formData }) => {
            const partyId =
                formData.partyId.trim() === '' ? undefined : formData.partyId

            try {
                await setRegistryUrl.mutateAsync({
                    party: partyId,
                    url: formData.registryUrl,
                })

                if (isInsecureRegistryUrl(formData.registryUrl)) {
                    toast.warning(INSECURE_REGISTRY_URL_ADDED_WARNING)
                } else {
                    toast.success('Registry URL set')
                }

                form.reset()
                setRegistryUrl.reset()
                onClose()
            } catch (error) {
                toast.error(
                    `Failed to add registry: ${error instanceof Error ? error.message : 'Unknown error'}`
                )
            }
        },
        validators: {
            onChange: registryFormSchema,
            onSubmit: registryFormSchema,
        },
    })

    const disabled = setRegistryUrl.isPending
    const mutationError = setRegistryUrl.error

    const handleClose = () => {
        if (!disabled) {
            form.reset()
            setRegistryUrl.reset()
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
                        Add Registry
                    </Typography>
                    <IconButton
                        aria-label="Close add registry dialog"
                        onClick={handleClose}
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
                            Failed to add registry:{' '}
                            {mutationError instanceof Error
                                ? mutationError.message
                                : 'Unknown error'}
                        </Alert>
                    )}

                    <form.Field name="partyId">
                        {(field) => (
                            <FieldBlock label="Party ID">
                                <TextField
                                    value={field.state.value}
                                    onChange={(event) =>
                                        field.handleChange(event.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    disabled={disabled}
                                    error={hasFieldError(field)}
                                    helperText={getFieldError(field)}
                                    placeholder="party-hint::fingerprint"
                                    slotProps={{
                                        htmlInput: {
                                            'aria-label': 'Party ID',
                                        },
                                    }}
                                    fullWidth
                                    sx={darkTextFieldSx}
                                />
                            </FieldBlock>
                        )}
                    </form.Field>

                    <form.Field name="registryUrl">
                        {(field) => {
                            const hasError = hasFieldError(field)
                            const showInsecureWarning =
                                !hasError &&
                                isInsecureRegistryUrl(field.state.value)

                            return (
                                <FieldBlock label="Registry URL">
                                    <TextField
                                        value={field.state.value}
                                        onChange={(event) =>
                                            field.handleChange(
                                                event.target.value
                                            )
                                        }
                                        onBlur={field.handleBlur}
                                        disabled={disabled}
                                        error={hasError}
                                        helperText={
                                            hasError
                                                ? getFieldError(field)
                                                : showInsecureWarning
                                                  ? INSECURE_REGISTRY_URL_WARNING
                                                  : undefined
                                        }
                                        placeholder="https://registry.example.com"
                                        slotProps={{
                                            htmlInput: {
                                                'aria-label': 'Registry URL',
                                            },
                                            formHelperText: {
                                                sx: showInsecureWarning
                                                    ? { color: 'warning.main' }
                                                    : undefined,
                                            },
                                        }}
                                        fullWidth
                                        sx={darkTextFieldSx}
                                    />
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
                                    !canSubmit || isSubmitting || disabled
                                }
                                sx={{ mt: 0.5, minHeight: 48 }}
                            >
                                {disabled || isSubmitting ? (
                                    <CircularProgress
                                        size={24}
                                        color="inherit"
                                    />
                                ) : (
                                    'Add'
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

const darkTextFieldSx: SxProps<Theme> = {
    '& .MuiInputBase-root': {
        minHeight: 48,
        bgcolor: (theme) => theme.portfolio.surface.required,
        color: 'text.primary',
        borderRadius: 1,
        '& fieldset': {
            border: 'none',
        },
        '&:hover fieldset': {
            border: 'none',
        },
    },
    '& .MuiInputBase-input': {
        px: 2.5,
        py: 1.25,
        '&::placeholder': {
            color: 'text.disabled',
            opacity: 1,
        },
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
