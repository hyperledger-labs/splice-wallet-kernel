import type { ActionItem } from './types'

export const isReceiver = (item: ActionItem) => {
    return item.currentPartyId === item.receiver
}

export const getCounterparty = (item: ActionItem) => {
    if (isReceiver(item)) {
        return { label: 'Sender', value: item.sender }
    }
    return { label: 'Receiver', value: item.receiver }
}
