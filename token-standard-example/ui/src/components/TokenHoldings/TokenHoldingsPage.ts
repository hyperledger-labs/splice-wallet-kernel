import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './TokenHoldingList'
import { ITokenHolding, LedgerService } from '../../ledger.service'

@customElement('token-holdings-page')
export class TokenHoldingsPage extends LitElement {
    @property({ attribute: false }) accessor ledgerService!: LedgerService

    connectedCallback() {
        super.connectedCallback()
        if (!this.ledgerService) {
            throw new Error(
                '<logged-in-view> requires `ledgerService` property'
            )
        }
    }

    @state()
    holdings: ITokenHolding[] = []

    @state()
    hasSubscribedToHoldings = false

    firstUpdated(changedProps: Map<string, unknown>) {
        super.firstUpdated(changedProps)
        this.updateHoldings()
    }

    private async updateHoldings() {
        this.holdings = await this.ledgerService.fetchHoldings()
    }

    render() {
        return html`
      <div>
        <h1>Token holdings</h1>
        <token-holding-list .holdings=${this.holdings}>
      </div>
    `
    }
}
