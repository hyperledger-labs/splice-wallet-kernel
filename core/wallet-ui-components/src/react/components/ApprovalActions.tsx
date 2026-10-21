// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Button, CircularProgress, Stack } from '@mui/material'

interface ApprovalActionsProps {
    /** Called when the approve button is clicked */
    onApprove: () => void
    /** Called when "Reject" is clicked. The button is hidden when omitted */
    onReject?: (() => void) | undefined
    /** The approve button's text @default 'Approve' */
    approveLabel?: string
    /** Shows progress on the approve button and disables both buttons @default false */
    approving?: boolean
    /** Shows progress on "Reject" and disables both buttons @default false */
    rejecting?: boolean
    /** Shows progress on the approve button and disables it. "Reject" stays available, so a request can still be turned down while it is being signed @default false */
    signing?: boolean
    /** Disables both buttons @default false */
    disabled?: boolean
}

const Progress = () => (
    <CircularProgress size={16} color="inherit" aria-hidden="true" />
)

/** The Reject and Approve buttons of an approval page, with their busy states */
export const ApprovalActions = ({
    onApprove,
    onReject,
    approveLabel = 'Approve',
    approving = false,
    rejecting = false,
    signing = false,
    disabled = false,
}: ApprovalActionsProps) => (
    <Stack direction="row" spacing={2}>
        {onReject && (
            <Button
                variant="outlined"
                color="error"
                fullWidth
                disabled={disabled || approving || rejecting}
                startIcon={rejecting ? <Progress /> : undefined}
                onClick={onReject}
            >
                Reject
            </Button>
        )}
        <Button
            variant="contained"
            fullWidth
            disabled={disabled || approving || rejecting || signing}
            startIcon={approving || signing ? <Progress /> : undefined}
            onClick={onApprove}
        >
            {approveLabel}
        </Button>
    </Stack>
)
