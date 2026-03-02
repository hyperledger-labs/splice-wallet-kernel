// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Typography } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { type Holding } from '@canton-network/core-tx-parser'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { CopyableIdentifier } from './copyable-identifier'

interface HoldingRowProps {
    holding: Holding
    symbol: string
}

export const HoldingRow: React.FC<HoldingRowProps> = ({ holding, symbol }) => {
    const isLocked = TokenStandardService.isHoldingLocked(holding, new Date())

    return (
        <Box
            sx={{
                py: 1.5,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:not(:last-child)': {
                    borderBottom: (theme) =>
                        `1px solid ${theme.palette.divider}`,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                    {holding.amount} {symbol}
                </Typography>
                {isLocked && (
                    <LockIcon
                        fontSize="small"
                        color="warning"
                        sx={{ fontSize: 16 }}
                    />
                )}
            </Box>
            <CopyableIdentifier value={holding.contractId} maxLength={12} />
        </Box>
    )
}
