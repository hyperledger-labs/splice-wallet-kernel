// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, type SubmitEvent } from 'react'
import type { GenerateApiKeyParams } from '@canton-network/core-wallet-user-rpc-client'
import { Box, Button, Stack, TextField } from '@mui/material'

interface ApiKeyFormProps {
    /** Called with the entered values when the form is submitted; the caller generates the key */
    onGenerate: (apiKeyParams: GenerateApiKeyParams) => void
}

export const ApiKeyForm = ({ onGenerate }: ApiKeyFormProps) => {
    const [name, setName] = useState('')

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault()
        onGenerate({ name })
    }

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <Stack spacing={2}>
                <TextField
                    label="Name"
                    required
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </Stack>
            <Box sx={{ mt: 'auto', pt: 3 }}>
                <Button type="submit" variant="contained" fullWidth>
                    Generate
                </Button>
            </Box>
        </Box>
    )
}
