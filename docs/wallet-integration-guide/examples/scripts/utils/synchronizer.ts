import type { SDKInterface } from '@canton-network/wallet-sdk'
import type { Logger } from 'pino'

/**
 * Pick the preferred synchronizer ID from the list returned by the ledger API.
 *
 * The SDK picks the first entry when multiple synchronizers are connected;
 * on multi-sync nodes that first entry may not be the global synchronizer.
 * Call this helper after fetching connected synchronizers and use the returned
 * ID as the explicit `synchronizerId` on `ledger.prepare()` / `multiPartySubmit()`
 * calls that must route to the global synchronizer.
 *
 * @param synchronizers - raw array from GET /v2/state/connected-synchronizers
 * @returns the synchronizerId of the entry whose alias is 'global', or the
 *          first entry's synchronizerId if no such alias exists
 */
export function resolvePreferredSynchronizerId(
    synchronizers: Array<{ synchronizerAlias: string; synchronizerId: string }>
): string {
    const preferred =
        synchronizers.find((s) => s.synchronizerAlias === 'global') ??
        synchronizers[0]
    if (!preferred) throw new Error('No connected synchronizers found')
    return preferred.synchronizerId
}

export type SynchronizerMap = {
    globalSynchronizerId: string
    appSynchronizerId: string
}

/** Resolve a synchronizer ID to a logical role alias */
export function syncAlias(
    syncId: string,
    synchronizers: SynchronizerMap
): string {
    if (syncId === synchronizers.globalSynchronizerId) return 'global'
    if (syncId === synchronizers.appSynchronizerId) return 'app-synchronizer'
    throw new Error(`Unknown synchronizer ID ${syncId}`)
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
