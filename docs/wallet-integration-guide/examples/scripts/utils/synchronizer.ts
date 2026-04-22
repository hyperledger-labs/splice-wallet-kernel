import type { SDKInterface } from '@canton-network/wallet-sdk'
import type { Logger } from 'pino'

export type SynchronizerMap = {
    globalSynchronizerId: string
    appSynchronizerId: string
}

/** Resolve a synchronizer ID to a human-readable alias */
export function syncAlias(
    syncId: string,
    synchronizers: SynchronizerMap
): string {
    if (syncId === synchronizers.globalSynchronizerId) return 'global'
    if (syncId === synchronizers.appSynchronizerId) return 'app-synchronizer'
    return syncId.substring(0, 20) + '...'
}

/**
 * Read contracts from ACS and log each contract's template name,
 * CID prefix, and synchronizer location.
 */
export async function logContracts(
    sdk: SDKInterface,
    logger: Logger,
    synchronizers: SynchronizerMap,
    label: string,
    templateIds: string[],
    parties: string[]
) {
    const contracts = await sdk.ledger.acs.read({
        templateIds,
        parties,
        filterByParty: true,
    })
    if (contracts.length === 0) {
        logger.info(`  [${label}] (none)`)
        return contracts
    }
    for (const c of contracts) {
        const tplParts = (c.templateId ?? '').split(':')
        const templateName = tplParts[tplParts.length - 1] || c.templateId
        logger.info(
            `  [${label}] ${templateName} cid=${c.contractId.substring(0, 16)}... on [${syncAlias(c.synchronizerId, synchronizers)}]`
        )
    }
    return contracts
}
