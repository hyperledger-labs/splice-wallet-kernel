import { queryOptions } from '@tanstack/react-query'
import { listPendingTransfers } from '../services/portfolio-service-implementation'

export const getPendingTransfersQueryOptions = (party: string | undefined) =>
    queryOptions({
        queryKey: ['listPendingTransfers', party],
        queryFn: async () =>
            party ? listPendingTransfers({ party: party! }) : [],
    })
