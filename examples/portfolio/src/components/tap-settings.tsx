// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import {
    Box,
    Typography,
    Button,
    TextField,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
} from '@mui/material'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useConnection } from '../contexts/ConnectionContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { usePrimaryAccount } from '../hooks/useAccounts'
import { useInstruments } from '../contexts/RegistryServiceContext'
import type { InstrumentId } from '@canton-network/core-token-standard'

const instrumentValidator = z
    .object({
        admin: z.string(),
        id: z.string(),
    })
    .nullable()
    .refine((val) => val !== null, 'Please select an instrument')

export const TapSettings: React.FC = () => {
    const sessionToken = useConnection().status?.session?.accessToken
    const primaryParty = usePrimaryAccount()?.partyId
    const { tap } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const instruments = useInstruments()

    const availableInstruments = useMemo(() => {
        const result: Array<{ instrumentId: InstrumentId; symbol: string }> = []
        for (const [admin, adminInstruments] of instruments) {
            for (const instrument of adminInstruments) {
                result.push({
                    instrumentId: { admin, id: instrument.id },
                    symbol: instrument.symbol,
                })
            }
        }
        return result.sort((a, b) => a.symbol.localeCompare(b.symbol))
    }, [instruments])

    const form = useForm({
        defaultValues: {
            instrumentId: null as InstrumentId | null,
            amount: '10000',
        },

        onSubmit: async ({ value: formData }) => {
            if (!sessionToken || !primaryParty || !formData.instrumentId) {
                return
            }

            try {
                await tap({
                    registryUrls,
                    party: primaryParty,
                    sessionToken,
                    instrumentId: formData.instrumentId,
                    amount: Number(formData.amount),
                })
                toast.success('Tap successful')
            } catch (error) {
                toast.error(
                    `Tap failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                )
            }
        },
    })

    const amountValidator = z
        .string()
        .min(1, 'Amount is required')
        .refine((val) => {
            const num = Number(val)
            return !isNaN(num) && num > 0
        }, 'Amount must be a positive number')

    return (
        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
                DevNet Tap
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                For testing purposes (DevNet only)
            </Typography>

            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    form.handleSubmit()
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <form.Field
                        name="instrumentId"
                        validators={{
                            onChange: instrumentValidator,
                        }}
                    >
                        {(field) => {
                            const selectedKey = field.state.value
                                ? `${field.state.value.admin}::${field.state.value.id}`
                                : ''

                            return (
                                <FormControl
                                    fullWidth
                                    error={
                                        field.state.meta.isTouched &&
                                        field.state.meta.errors.length > 0
                                    }
                                >
                                    <InputLabel id="tap-instrument-label">
                                        Instrument
                                    </InputLabel>
                                    <Select
                                        labelId="tap-instrument-label"
                                        value={selectedKey}
                                        onChange={(e) => {
                                            const key = e.target.value
                                            if (!key) {
                                                field.handleChange(null)
                                                return
                                            }
                                            const selected =
                                                availableInstruments.find(
                                                    (i) =>
                                                        `${i.instrumentId.admin}::${i.instrumentId.id}` ===
                                                        key
                                                )
                                            field.handleChange(
                                                selected?.instrumentId ?? null
                                            )
                                        }}
                                        label="Instrument"
                                    >
                                        <MenuItem value="">
                                            <em>Select an instrument...</em>
                                        </MenuItem>
                                        {availableInstruments.map((inst) => {
                                            const key = `${inst.instrumentId.admin}::${inst.instrumentId.id}`
                                            return (
                                                <MenuItem key={key} value={key}>
                                                    {inst.symbol}
                                                </MenuItem>
                                            )
                                        })}
                                    </Select>
                                    {field.state.meta.isTouched &&
                                        field.state.meta.errors.length > 0 && (
                                            <FormHelperText>
                                                {
                                                    field.state.meta.errors[0]
                                                        ?.message
                                                }
                                            </FormHelperText>
                                        )}
                                </FormControl>
                            )
                        }}
                    </form.Field>

                    <form.Field
                        name="amount"
                        validators={{
                            onChange: amountValidator,
                        }}
                    >
                        {(field) => (
                            <TextField
                                label="Amount"
                                type="number"
                                value={field.state.value}
                                onChange={(e) =>
                                    field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                                error={
                                    field.state.meta.isTouched &&
                                    field.state.meta.errors.length > 0
                                }
                                helperText={
                                    field.state.meta.isTouched &&
                                    field.state.meta.errors.length > 0
                                        ? field.state.meta.errors[0]?.message
                                        : ''
                                }
                                fullWidth
                            />
                        )}
                    </form.Field>

                    <form.Subscribe
                        selector={(state) => ({
                            canSubmit: state.canSubmit,
                        })}
                    >
                        {({ canSubmit }) => (
                            <Button
                                type="submit"
                                disabled={
                                    !canSubmit || !sessionToken || !primaryParty
                                }
                                variant="contained"
                                sx={{ width: 200 }}
                            >
                                TAP
                            </Button>
                        )}
                    </form.Subscribe>
                </Box>
            </form>
        </Paper>
    )
}
