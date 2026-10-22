// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TextField } from '@mui/material'

interface SigningProviderSelectProps {
    /** The signing provider ids to choose from. `undefined` while they are loading, which disables the select */
    signingProviders?: string[] | undefined
    /** The selected signing provider id, or '' when none is selected */
    value: string
    onChange: (signingProviderId: string) => void
    /** Disables the select, e.g. while submitting @default false */
    disabled?: boolean
    /** Providers that are listed but can't be chosen */
    disabledProviders?: string[]
}

/** The signing provider field shared by the wallet create and edit forms */
export const SigningProviderSelect = ({
    signingProviders,
    value,
    onChange,
    disabled = false,
    disabledProviders = [],
}: SigningProviderSelectProps) => {
    const loading = signingProviders === undefined
    const hasNoProviders = signingProviders?.length === 0

    return (
        <TextField
            // The id the e2e helpers and the Lit form used
            id="signing-provider-id"
            select
            label="Signing Provider"
            required
            fullWidth
            value={value}
            disabled={disabled || loading || hasNoProviders}
            onChange={(e) => onChange(e.target.value)}
            // A native select: it is what screen readers and e2e tests expect
            slotProps={{
                select: { native: true },
                inputLabel: { shrink: true },
            }}
        >
            <option value="" disabled>
                {loading
                    ? 'Loading signing providers...'
                    : hasNoProviders
                      ? 'No signing providers available'
                      : 'Select signing provider'}
            </option>
            {signingProviders?.map((providerId) => (
                <option
                    key={providerId}
                    value={providerId}
                    disabled={disabledProviders.includes(providerId)}
                >
                    {providerId}
                </option>
            ))}
        </TextField>
    )
}
