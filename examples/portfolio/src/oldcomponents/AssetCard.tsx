// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { useInstrumentInfo } from '../contexts/RegistryServiceContext'

interface AssetCardProps {
    name?: string
    amount: string
    instrument: { admin: string; id: string }
}

export const AssetCard: React.FC<AssetCardProps> = ({
    name,
    amount,
    instrument,
}: AssetCardProps) => {
    const instrumentInfo = useInstrumentInfo(instrument)
    const tooltip = `${instrument.id} from admin ${instrument.admin}`
    return (
        <span>
            {name && <span>{name}</span>}
            <strong>{amount}</strong>
            {instrumentInfo ? (
                <span title={tooltip}> {instrumentInfo.instrument.symbol}</span>
            ) : (
                <span title={tooltip}>
                    {' '}
                    {instrument.id} (warning: unknown instrument)
                </span>
            )}
        </span>
    )
}
