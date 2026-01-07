// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { useInstruments } from '../contexts/RegistryServiceContext'

export type SelectInstrumentProps = {
    value: { admin: string; id: string } | undefined
    onChange: (_: { admin: string; id: string } | undefined) => void
}

export const SelectInstrument: React.FC<SelectInstrumentProps> = ({
    value,
    onChange,
}) => {
    const instruments = useInstruments()

    // TODO: useMemo
    const bySymbol = new Map<string, { admin: string; id: string }>()
    let initialSymbol = ''
    for (const [admin, adminInstruments] of instruments) {
        for (const instrument of adminInstruments) {
            if (bySymbol.has(instrument.symbol)) {
                throw new Error(`duplicate symbol: ${instrument.symbol}`)
            } else {
                bySymbol.set(instrument.symbol, {
                    admin: admin,
                    id: instrument.id,
                })
            }
            if (instrument.id === value?.id && admin === value?.admin) {
                initialSymbol = instrument.symbol
            }
        }
    }
    const sortedSymbols = [...bySymbol.keys()].sort()
    const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol)

    return (
        <select
            value={selectedSymbol}
            onChange={(e) => {
                setSelectedSymbol(e.target.value)
                onChange(bySymbol.get(e.target.value))
            }}
        >
            <option key="" value="">
                Select an option...
            </option>
            {sortedSymbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                    {symbol}
                </option>
            ))}
        </select>
    )
}
