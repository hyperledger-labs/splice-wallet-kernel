// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react'

interface AssetCardProps {
    name?: string
    amount: string
    symbol: string
}

export const AssetCard: React.FC<AssetCardProps> = ({
    name,
    amount,
    symbol,
}: AssetCardProps) => {
    return (
        <div>
            {name && <span>{name}</span>} <strong>{amount}</strong> {symbol}
        </div>
    )
}
