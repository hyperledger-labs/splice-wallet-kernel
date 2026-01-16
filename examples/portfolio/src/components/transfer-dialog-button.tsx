// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { MenuItem } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'

interface TransferDialogButtonProps {
    onClick: () => void
}

export const TransferDialogButton: React.FC<TransferDialogButtonProps> = ({
    onClick,
}) => {
    return (
        <MenuItem onClick={onClick} sx={{ py: 1.5 }}>
            <SendIcon sx={{ mr: 2, fontSize: 20 }} />
            Make Transfer
        </MenuItem>
    )
}
