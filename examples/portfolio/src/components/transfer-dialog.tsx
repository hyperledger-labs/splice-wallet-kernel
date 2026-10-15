// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useState } from 'react'
import { Dialog } from '@mui/material'
import { useCreateTransfer } from '@hooks/useCreateTransfer'
import { TransferForm } from './transfer-form'
import { TransferSummary } from './transfer-summary'
import type { SubmittedTransfer, TransferFormData } from './transfer-types'

interface TransferDialogProps {
    open: boolean
    onClose: () => void
    initialValues?: TransferFormData
}

type DialogState = 'form' | 'summary'

export const TransferDialog: React.FC<TransferDialogProps> = ({
    open,
    onClose,
    initialValues,
}) => {
    const [dialogState, setDialogState] = useState<DialogState>('form')
    const [submittedTransfer, setSubmittedTransfer] =
        useState<SubmittedTransfer | null>(null)
    const [formKey, setFormKey] = useState(0)
    const createTransferMutation = useCreateTransfer()
    const { isPending, reset: resetTransferMutation } = createTransferMutation

    const reset = useCallback(() => {
        setDialogState('form')
        setSubmittedTransfer(null)
        resetTransferMutation()
        setFormKey((key) => key + 1)
    }, [resetTransferMutation])

    const handleClose = () => {
        if (!isPending) {
            onClose()
            reset()
        }
    }

    const handleSubmitted = (transfer: SubmittedTransfer) => {
        setSubmittedTransfer(transfer)
        setDialogState('summary')
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth={false}
            slotProps={{
                paper: {
                    sx: {
                        width: 'min(100%, 640px)',
                        bgcolor: 'background.paper',
                        backgroundImage: 'none',
                        borderRadius: 1,
                        boxShadow: 24,
                        color: 'text.primary',
                    },
                },
                backdrop: {
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.64)',
                        backdropFilter: 'blur(2px)',
                    },
                },
            }}
        >
            {dialogState === 'summary' && submittedTransfer ? (
                <TransferSummary
                    transfer={submittedTransfer}
                    onDone={handleClose}
                />
            ) : (
                <TransferForm
                    key={formKey}
                    initialValues={initialValues}
                    createTransferMutation={createTransferMutation}
                    onClose={handleClose}
                    onSubmitted={handleSubmitted}
                />
            )}
        </Dialog>
    )
}
