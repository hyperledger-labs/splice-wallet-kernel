export interface ActionItem {
    id: string
    tag: string
    type: string
    date: string
    expiry: string
    message: string
    sender: string
    receiver: string
    currentPartyId: string
    instrumentId: { admin: string; id: string }
    amount: string
}
