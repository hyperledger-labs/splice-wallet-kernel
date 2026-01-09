import { PartyId } from '@canton-network/core-types'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { queryKeys } from './query-keys'

export const useExerciseTransfer = () => {
    const { exerciseTransfer } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (args: {
            party: PartyId
            contractId: string
            instrumentId: { admin: string; id: string }
            instructionChoice: 'Accept' | 'Reject' | 'Withdraw'
        }) =>
            exerciseTransfer({
                registryUrls,
                ...args,
            }),
        onSuccess: async (_, args) => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.listPendingTransfers(args.party),
            })
        },
    })
}
