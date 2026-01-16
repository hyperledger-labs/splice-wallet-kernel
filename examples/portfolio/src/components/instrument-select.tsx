// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Box,
    Typography,
} from '@mui/material'
import { useAggregatedHoldings } from '../hooks/useWalletInstruments'
import type { InstrumentId } from '@canton-network/core-token-standard'
import Decimal from 'decimal.js'

interface SelectableInstrument {
    instrumentId: InstrumentId
    symbol: string
    name: string
    availableAmount: string
    decimals: number
}

export interface InstrumentSelectProps {
    partyId: string | undefined
    value: InstrumentId | null
    onChange: (instrument: InstrumentId | null) => void
    disabled?: boolean
    error?: boolean
    helperText?: string
}

export const InstrumentSelect: React.FC<InstrumentSelectProps> = ({
    partyId,
    value,
    onChange,
    disabled = false,
    error = false,
    helperText,
}) => {
    const { instruments: aggregatedHoldings } = useAggregatedHoldings(partyId)

    const selectableInstruments = useMemo(
        (): SelectableInstrument[] =>
            aggregatedHoldings.flatMap((holding) => {
                const instrument = holding.instrument
                if (!instrument) return []
                if (new Decimal(holding.availableAmount).lte(0)) return []

                return [
                    {
                        instrumentId: holding.instrumentId,
                        symbol: instrument.symbol,
                        name: instrument.name,
                        availableAmount: holding.availableAmount,
                        decimals: instrument.decimals,
                    },
                ]
            }),
        [aggregatedHoldings]
    )

    const selectedKey = value ? `${value.admin}::${value.id}` : ''

    const handleChange = (key: string) => {
        if (!key) {
            onChange(null)
            return
        }
        const selected = selectableInstruments.find(
            (i) => `${i.instrumentId.admin}::${i.instrumentId.id}` === key
        )
        onChange(selected?.instrumentId ?? null)
    }

    return (
        <FormControl fullWidth error={error} disabled={disabled}>
            <InputLabel id="instrument-select-label">Instrument</InputLabel>
            <Select
                labelId="instrument-select-label"
                value={selectedKey}
                onChange={(e) => handleChange(e.target.value)}
                label="Instrument"
            >
                <MenuItem value="">
                    <em>Select an instrument...</em>
                </MenuItem>
                {selectableInstruments.map((instrument) => {
                    const key = `${instrument.instrumentId.admin}::${instrument.instrumentId.id}`
                    return (
                        <MenuItem key={key} value={key}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    gap: 2,
                                }}
                            >
                                <Typography>{instrument.symbol}</Typography>
                                <Typography color="text.secondary">
                                    Available: {instrument.availableAmount}
                                </Typography>
                            </Box>
                        </MenuItem>
                    )
                })}
            </Select>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    )
}
