import { queryOptions } from '@tanstack/react-query'
import { listPendingTransfers } from '../services/portfolio-service-implementation'
import { queryKeys } from './query-keys'

export const getPendingTransfersQueryOptions = (party: string | undefined) =>
    queryOptions({
        queryKey: queryKeys.listPendingTransfers(party),
        queryFn: async () =>
            party ? listPendingTransfers({ party: party! }) : [],
    })
