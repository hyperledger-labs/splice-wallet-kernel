// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { ParsedTransactionInfo } from '@canton-network/core-tx-visualizer'
import { Box, Button, Chip, Collapse, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    formatActivityDate,
    getActivityStatusColor,
    getActivityStatusLabel,
    getActivityType,
} from '../../internal/activity-utils'
import { ApprovalActions } from './ApprovalActions'
import { BackLink } from './BackLink'
import { CardDetailRow } from './CardDetailRow'
import { CopyButton } from './CopyButton'

interface CopyableRowProps {
    label: string
    value?: string | null | undefined
    copyLabel: string
}

// A value with a copy button, or "N/A" without one when there is nothing to copy
const CopyableRow = ({ label, value, copyLabel }: CopyableRowProps) => (
    <CardDetailRow
        label={label}
        value={value || 'N/A'}
        action={
            value ? <CopyButton value={value} label={copyLabel} /> : undefined
        }
    />
)

interface TransactionDetailProps {
    commandId: string
    externalTxId?: string | null
    /** e.g. 'pending', 'signed', 'executed', 'failed'. Only pending and signed transactions can be acted on */
    status: string
    txHash?: string
    parsed?: ParsedTransactionInfo | null
    createdAt?: string | null
    /** Shows a "Back" link to this URL. The link is hidden when omitted */
    backHref?: string
    /** Shows progress on "Approve" and disables both buttons @default false */
    approving?: boolean
    /** Shows progress on "Reject" and disables both buttons @default false */
    rejecting?: boolean
    /** Shows progress on "Approve" and disables it. "Reject" stays available, so a transaction can still be turned down while it is signed @default false */
    signing?: boolean
    /** The last submit of a signed transaction failed: "Approve" becomes "Retry submit" @default false */
    submitFailed?: boolean
    /** Disables both buttons, whatever the status @default false */
    disabled?: boolean
    /** Called when "Approve" (or "Retry submit") is clicked */
    onApprove: (commandId: string) => void
    /** Called when "Reject" is clicked. The button is hidden when omitted */
    onReject?: (commandId: string) => void
}

export const TransactionDetail = ({
    commandId,
    externalTxId = null,
    status,
    txHash,
    parsed = null,
    createdAt = null,
    backHref,
    approving = false,
    rejecting = false,
    signing = false,
    submitFailed = false,
    disabled = false,
    onApprove,
    onReject,
}: TransactionDetailProps) => {
    const [jsonExpanded, setJsonExpanded] = useState(false)

    const signatories = parsed?.signatories ?? []
    const json = parsed?.jsonString

    const canAct = status === 'pending' || status === 'signed'

    return (
        <Stack spacing={2}>
            <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
                <Typography variant="h5" component="h1">
                    Activity Details
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
                <CardDetailRow
                    label="Action type"
                    value={getActivityType(parsed)}
                />
                <CardDetailRow
                    label="Created at"
                    value={formatActivityDate(createdAt)}
                />
                <CardDetailRow
                    label="Signatories"
                    value={
                        signatories.length ? (
                            <Stack
                                spacing={0.5}
                                sx={{ alignItems: 'flex-end' }}
                            >
                                {signatories.map((signatory) => (
                                    <Stack
                                        key={signatory}
                                        direction="row"
                                        sx={{ alignItems: 'center' }}
                                    >
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            title={signatory}
                                        >
                                            {signatory}
                                        </Typography>
                                        <CopyButton
                                            value={signatory}
                                            label="Copy signatory"
                                        />
                                    </Stack>
                                ))}
                            </Stack>
                        ) : (
                            'N/A'
                        )
                    }
                />
                <CopyableRow
                    label="Template"
                    value={parsed?.templateId}
                    copyLabel="Copy template"
                />
                <CopyableRow
                    label="Command ID"
                    value={commandId}
                    copyLabel="Copy command ID"
                />
                {externalTxId && (
                    <CopyableRow
                        label="External transaction ID"
                        value={externalTxId}
                        copyLabel="Copy external transaction ID"
                    />
                )}
                <CopyableRow
                    label="Transaction hash"
                    value={txHash}
                    copyLabel="Copy transaction hash"
                />

                <Box>
                    <Stack
                        direction="row"
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Button
                            color="inherit"
                            aria-expanded={jsonExpanded}
                            endIcon={
                                <ExpandMoreIcon
                                    sx={{
                                        transform: jsonExpanded
                                            ? 'rotate(180deg)'
                                            : 'none',
                                    }}
                                />
                            }
                            onClick={() => setJsonExpanded((open) => !open)}
                        >
                            Transaction JSON Object
                        </Button>
                        {json && (
                            <CopyButton
                                value={json}
                                label="Copy transaction json object"
                            />
                        )}
                    </Stack>
                    <Collapse in={jsonExpanded} unmountOnExit>
                        <Box
                            component="pre"
                            sx={{
                                m: 0,
                                p: 1.5,
                                overflow: 'auto',
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                fontSize: '0.8125rem',
                            }}
                        >
                            {json || 'N/A'}
                        </Box>
                    </Collapse>
                </Box>
            </Stack>

            {canAct && (
                <ApprovalActions
                    approveLabel={
                        status === 'signed' && submitFailed
                            ? 'Retry submit'
                            : 'Approve'
                    }
                    approving={approving}
                    rejecting={rejecting}
                    signing={signing}
                    disabled={disabled}
                    onApprove={() => onApprove(commandId)}
                    // A signed transaction can't be rejected any more
                    onReject={
                        status === 'pending' && onReject
                            ? () => onReject(commandId)
                            : undefined
                    }
                />
            )}
        </Stack>
    )
}
