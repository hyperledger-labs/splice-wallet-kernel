import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './TokenHoldings/TokenHoldingsPage'
import './TokenTransfers/TokenTransfersPage'
import './TokenFactories/TokenFactoriesPage'
import { LedgerService } from '../ledger.service'

export const pages = {
    Holdings: 'holdings',
    Transfers: 'transfers',
    Factories: 'factories',
} as const

type TPages = (typeof pages)[keyof typeof pages]

@customElement('logged-in-view')
export class LoggedInView extends LitElement {
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
    currentPage: TPages = pages.Holdings

    get username() {
        return this.ledgerService?.userId || ''
    }

    private renderCurrentPage() {
        switch (this.currentPage) {
            case pages.Holdings:
                return html` <token-holdings-page
                    .ledgerService=${this.ledgerService}
                ></token-holdings-page>`
            case pages.Transfers:
                return html` <token-transfers-page
                    .ledgerService=${this.ledgerService}
                ></token-transfers-page>`
            case pages.Factories:
                return html` <token-factories-page
                    .ledgerService=${this.ledgerService}
                ></token-factories-page>`
            default:
                return html`Can't find page ${this.currentPage}`
        }
    }

    private renderPageSwitcher() {
        return html`
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                ${Object.values(pages).map(
                    (page) => html`
                        <button
                            @click=${() => (this.currentPage = page)}
                            style="
              padding: 0.5rem 1rem;
              border: none;
              cursor: pointer;
              background-color: ${this.currentPage === page
                                ? '#007bff'
                                : '#eee'};
              color: ${this.currentPage === page ? 'white' : 'black'};
              border-radius: 4px;
            "
                        >
                            ${page}
                        </button>
                    `
                )}
            </div>
        `
    }

    render() {
        return html`
            <p>Logged in as ${this.username}</p>
            ${this.renderPageSwitcher()} ${this.renderCurrentPage()}
        `
    }
}
