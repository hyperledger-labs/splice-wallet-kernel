// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Chip, Stack, Typography } from '@mui/material'
import {
    getActivityStatusColor,
    getActivityStatusLabel,
} from '../../internal/activity-utils'
import { ApprovalActions } from './ApprovalActions'
import { BackLink } from './BackLink'
import { CardDetailRow } from './CardDetailRow'
import { CopyButton } from './CopyButton'

interface MessageDetailProps {
    messageId: string
    /** The message to sign, shown as is */
    message: string
    /** e.g. 'pending', 'signed', 'failed'. Only pending messages can be acted on */
    status: string
    /** Who asked for the message to be signed. The row is hidden when omitted */
    origin?: string | null
    externalTxId?: string | null
    /** Shows a "Back" link to this URL. The link is hidden when omitted */
    backHref?: string
    /** Shows progress on "Approve" and disables both buttons @default false */
    approving?: boolean
    /** Shows progress on "Reject" and disables both buttons @default false */
    rejecting?: boolean
    /** Shows progress on "Approve" and disables it. "Reject" stays available, so a message can still be turned down while it is signed @default false */
    signing?: boolean
    /** Disables both buttons, whatever the status @default false */
    disabled?: boolean
    /** Called when "Approve" is clicked */
    onApprove: (messageId: string) => void
    /** Called when "Reject" is clicked. The button is hidden when omitted */
    onReject?: (messageId: string) => void
}

export const MessageDetail = ({
    messageId,
    message,
    status,
    origin = null,
    externalTxId = null,
    backHref,
    approving = false,
    rejecting = false,
    signing = false,
    disabled = false,
    onApprove,
    onReject,
}: MessageDetailProps) => (
    <Stack spacing={2}>
        <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
            <Typography variant="h5" component="h1">
                Message Details
            </Typography>
            {backHref && <BackLink href={backHref} />}
        </Stack>

        <Stack spacing={0.5}>
            <CardDetailRow
                label="Status"
                value={
                    <Chip
                        data-testid="activity-status"
                        label={getActivityStatusLabel(status)}
                        color={getActivityStatusColor(status)}
                        size="small"
                    />
                }
            />
            {origin && <CardDetailRow label="Requested by" value={origin} />}
            {externalTxId && (
                <CardDetailRow
                    label="External transaction ID"
                    value={externalTxId}
                    action={
                        <CopyButton
                            value={externalTxId}
                            label="Copy external transaction ID"
                        />
                    }
                />
            )}
            <Box>
                <Typography
                    variant="body2"
                    component="h2"
                    sx={{ fontWeight: 'bold', py: 1 }}
                >
                    Message
                </Typography>
                <Box
                    component="pre"
                    sx={{
                        m: 0,
                        p: 1.5,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        fontSize: '0.8125rem',
                    }}
                >
                    {message}
                </Box>
            </Box>
        </Stack>

        {status === 'pending' && (
            <ApprovalActions
                approving={approving}
                rejecting={rejecting}
                signing={signing}
                disabled={disabled}
                onApprove={() => onApprove(messageId)}
                onReject={onReject && (() => onReject(messageId))}
            />
        )}
    </Stack>
)
