// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineBackground } from 'wxt/utils/define-background'
import { startBackground } from '@/background'

// Use the object form: `wxt prepare` strips `main` (and the imports only it
// uses) when loading entrypoints, but cannot strip a bare function reference.
export default defineBackground({ main: startBackground })
