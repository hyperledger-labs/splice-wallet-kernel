import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import { TokenStandardService } from '@canton-network/core-ledger-client'
import { ActionRequired } from '../components/action-required'
import { useConnection } from '../contexts/ConnectionContext'
import { getPendingTransfersQueryOptions } from '../hooks/query-options'
import { useSuspenseQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    const { status } = useConnection()
    const { primaryParty } = status
    const pendingTransfers = useSuspenseQuery(
        getPendingTransfersQueryOptions(primaryParty)
    )

    const actionItems = useMemo(() => {
        if (!pendingTransfers.data || !primaryParty) return []

        return pendingTransfers.data.map((contract) => {
            const view = contract.interfaceViewValue
            const transfer = view.transfer
            const status = view.status
            const tag = (
                'tag' in status ? status.tag : status.current?.tag
            ) as string

            const memo =
                transfer?.meta?.values?.[TokenStandardService.MEMO_KEY] ?? ''

            return {
                id: contract.contractId,
                currentPartyId: primaryParty,
                tag: tag,
                type: tag?.startsWith('Transfer') ? 'Transfer' : tag,
                date: transfer.requestedAt,
                expiry: transfer.executeBefore,
                message: memo,
                sender: transfer.sender,
                receiver: transfer.receiver,
                instrumentId: transfer.instrumentId,
                amount: transfer?.amount,
            }
        })
    }, [pendingTransfers.data, primaryParty])

    return (
        <Box sx={{ my: 8 }}>
            <Typography variant="h3" component="h1" sx={{ mb: 6 }}>
                Dashboard
            </Typography>
            <ActionRequired items={actionItems} />
            {/* <WalletsPreview /> */}
        </Box>
    )
}
