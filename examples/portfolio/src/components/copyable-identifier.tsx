import React, { useState } from 'react'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'

interface CopyableIdentifierProps {
    value: string
    maxLength?: number
}

export const CopyableIdentifier: React.FC<CopyableIdentifierProps> = ({
    value,
    maxLength = 8,
}) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const parts = value.split('::')
    const prefix = parts[0] || ''
    const suffix = parts[1] || ''

    const displayValue =
        suffix.length > maxLength
            ? `${prefix}::${suffix.slice(0, maxLength)}...`
            : value

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" component="span">
                {displayValue}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton size="small" onClick={handleCopy} sx={{ p: 0.5 }}>
                    {copied ? (
                        <CheckIcon fontSize="small" />
                    ) : (
                        <ContentCopyIcon fontSize="small" />
                    )}
                </IconButton>
            </Tooltip>
        </Box>
    )
}
