// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { IconButton, Tooltip } from '@mui/material'
import { useState } from 'react'

import ContentCopyIcon from '@mui/icons-material/ContentCopy'

interface CopyButtonProps {
    onCopy: (value: string) => void
    value: string
    label?: string
}

export const CopyButton = ({ onCopy, value, label }: CopyButtonProps) => {
    const [copied, setCopied] = useState(false)

    return (
        <Tooltip title={label || 'Copy to clipboard'}>
            <IconButton
                aria-label="Copy"
                onClick={async () => {
                    try {
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(value)
                        } else {
                            throw new Error(
                                'Browser does not support clipboard functionality.'
                            )
                        }

                        onCopy(value)
                        setTimeout(() => setCopied(false), 1200)
                        setCopied(true)
                    } catch (error) {
                        console.error('Unable to copy value', error)
                    }
                }}
            >
                <ContentCopyIcon color={copied ? 'success' : 'inherit'} />
            </IconButton>
        </Tooltip>
    )
}
