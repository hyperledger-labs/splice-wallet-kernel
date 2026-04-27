import type { SDKInterface } from '@canton-network/wallet-sdk'
import type { Logger } from 'pino'

/**
 * Pick the preferred synchronizer ID from the list returned by the ledger API.
 *
 * When a participant is connected to multiple synchronizers the ledger API may
 * return them in any order. This helper ensures the global synchronizer is
 * always selected — regardless of position — by looking for the entry whose
 * alias is `'global'`. If no such entry exists (e.g. single-synchronizer
 * setups) the first entry is returned as the default.
 *
 * Pass the returned ID as the explicit `synchronizerId` on `ledger.prepare()`
 * and `ledger.internal.prepare()` calls that must route to the global
 * synchronizer.
 *
 * @param synchronizers - Raw array from `GET /v2/state/connected-synchronizers`.
 * @returns The `synchronizerId` of the entry aliased `'global'`, or the first
 *          entry's `synchronizerId` when no global alias is present.
 * @throws {Error} When the array is empty.
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
