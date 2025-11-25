// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react'

interface AssetCardProps {
    name?: string
    value: number
    symbol: string
}

export const AssetCard: React.FC<AssetCardProps> = ({
    name,
    value,
    symbol,
}: AssetCardProps) => {
    return (
        <div>
            {name && <span>{name}</span>} <strong>{value}</strong> {symbol}
        </div>
    )
}
