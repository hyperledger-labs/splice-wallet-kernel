// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { IconButton, Tooltip } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { logger } from '../logger'

interface CopyButtonProps {
    onCopy?: (value: string) => void
    value: string
    label?: string
}

export const CopyButton = ({
    onCopy,
    value,
    label = 'Copy to clipboard',
}: CopyButtonProps) => {
    const [copied, setCopied] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => () => clearTimeout(timeoutRef.current), [])

    return (
        <Tooltip title={copied ? 'Copied' : label}>
            <IconButton
                aria-label={label}
                onClick={async (e) => {
                    // Don't trigger click handlers of a surrounding card or list item
                    e.stopPropagation()
                    if (!value) return

                    try {
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(value)
                        } else {
                            throw new Error(
                                'Browser does not support clipboard functionality.'
                            )
                        }

                        if (onCopy !== undefined) onCopy(value)

                        clearTimeout(timeoutRef.current)
                        timeoutRef.current = setTimeout(
                            () => setCopied(false),
                            1200
                        )
                        setCopied(true)
                    } catch (error) {
                        logger
                            .getChild('CopyButton')
                            .error('Unable to copy value', { error })
                    }
                }}
            >
                <ContentCopyIcon color={copied ? 'success' : 'inherit'} />
            </IconButton>
        </Tooltip>
    )
}
