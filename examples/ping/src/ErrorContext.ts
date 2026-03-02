// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext } from 'react'

export interface ErrorContextType {
    errorMsg: string
    setErrorMsg: (msg: string) => void
}

export const ErrorContext = createContext<ErrorContextType>({
    errorMsg: '',
    setErrorMsg: () => {},
})
