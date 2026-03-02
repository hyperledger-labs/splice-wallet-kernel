// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'

export type DateTimePickerProps = {
    id: string
    value: Date
    onChange: (_: Date) => void
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
    id,
    value: initialValue,
    onChange,
}) => {
    const [value, setValue] = useState<Date>(initialValue)

    return (
        <input
            id={id}
            type="datetime-local"
            value={value.toISOString().slice(0, 16)}
            onChange={(e) => {
                const d = new Date(e.target.value)
                setValue(d)
                onChange(d)
            }}
        />
    )
}
