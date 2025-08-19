import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './TokenHoldingList'
import './TokenHoldingMintForm'
import {
    ITokenHolding,
    ITokenTransferFactory,
    LedgerService,
} from '../../ledger.service'

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
    transferFactories: ITokenTransferFactory[] = []

    @state()
    parties: string[] = []

    @state()
    hasSubscribedToHoldings = false

    firstUpdated(changedProps: Map<string, unknown>) {
        super.firstUpdated(changedProps)
        if (this.ledgerService.isOperator) {
            this.updateTransferFactories()
            this.updateParties()
        } else {
            this.updateHoldings()
        }
    }

    private async updateHoldings() {
        this.holdings = await this.ledgerService.fetchHoldings()
    }

    private async updateTransferFactories() {
        this.transferFactories =
            await this.ledgerService.fetchTransferFactories()
    }

    private async updateParties() {
        this.parties = await this.ledgerService.fetchParties()
    }

    private async onSubmitMint(e: CustomEvent) {
        // TODO add loading
        const instrumentId = {
            admin: this.ledgerService.party as string,
            id: e.detail.symbol,
        }
        try {
            await this.ledgerService.createHolding(
                e.detail.receiver,
                instrumentId,
                e.detail.amount
            )
            this.clearForm()
        } catch (error) {
            console.log(error)
            alert("Couldn't create the transfer")
        }
    }

    private clearForm() {
        const formElement = this.renderRoot.querySelector(
            'token-holding-mint-form'
        )
        // @ts-expect-error reason TBS
        if (formElement?.clearForm) {
            // @ts-expect-error reason TBS
            formElement.clearForm()
        }
    }

    render() {
        return html`
            <div>
                <h1>Token holdings</h1>
                ${this.ledgerService.isOperator
                    ? html` <token-holding-mint-form
                          .transferFactories=${this.transferFactories}
                          .parties=${this.parties}
                          @submit-mint=${this.onSubmitMint}
                      ></token-holding-mint-form>`
                    : html` <token-holding-list
                          .holdings=${this.holdings}
                      ></token-holding-list>`}
            </div>
        `
    }
}
