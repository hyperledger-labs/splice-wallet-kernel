// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyButton } from './copy-button'

const meta: Meta = {
    title: 'CopyButton',
    component: CopyButton,
}

export default meta

export const Default: StoryObj = {}

// export const InContext: StoryObj = {
//     render: () => html`
//         <div style="display:flex; align-items:center; gap:8px;">
//             <code>party::1220abc1234567890</code>
//             <wg-copy-button
//                 value="party::1220abc1234567890"
//                 label="Copy Party ID"
//                 @copy-success=${onCopy}
//             ></wg-copy-button>
//         </div>
//     `,
// }
