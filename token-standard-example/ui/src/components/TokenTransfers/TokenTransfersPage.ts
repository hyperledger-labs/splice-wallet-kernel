import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './TokenTransferForm'
import './TokenTransferList'
import {
    ITokenHolding,
    ITokenTransferInstruction,
    LedgerService,
} from '../../ledger.service'

@customElement('token-transfers-page')
export class TokenTransfersPage extends LitElement {
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
    transfers: ITokenTransferInstruction[] = []

    @state()
    holdings: ITokenHolding[] = []

    @state()
    hasSubscribedToTransfers = false

    @state()
    hasSubscribedToHoldings = false

    firstUpdated(changedProps: Map<string, unknown>) {
        super.firstUpdated(changedProps)
        this.updateHoldings()
        this.updateTransfers()
    }

    private async updateHoldings() {
        this.holdings = await this.ledgerService.fetchHoldings()
    }

    private async updateTransfers() {
        this.transfers = await this.ledgerService.fetchTransfers()
    }

    private async onSubmitTransfer(e: CustomEvent) {
        // TODO add loading
        try {
            await this.ledgerService.createTransfer(
                e.detail.recipient,
                e.detail.token,
                e.detail.amount,
                e.detail.inputHoldingCids
            )
            this.clearForm()
        } catch (error) {
            console.log(error)
            alert("Couldn't create the transfer")
        }
    }

    private async onAcceptTransfer(e: CustomEvent) {
        // TODO add loading
        try {
            await this.ledgerService.acceptTransfer(e.detail.transfer)
        } catch (error) {
            console.log(error)
            alert("Couldn't accept the transfer")
        }
    }

    private async onRejectTransfer(e: CustomEvent) {
        // TODO add loading
        try {
            await this.ledgerService.rejectTransfer(e.detail.transfer)
        } catch (error) {
            console.log(error)
            alert("Couldn't reject the transfer")
        }
    }

    private clearForm() {
        const formElement = this.renderRoot.querySelector('token-transfer-form')
        // @ts-expect-error reason TBS
        if (formElement?.clearForm) {
            // @ts-expect-error reason TBS
            formElement.clearForm()
        }
    }

    render() {
        return html`
            <div>
                <h1>Token transfers</h1>
                <token-transfer-form
                    .holdings=${this.holdings}
                    @submit-transfer=${(e: CustomEvent) =>
                        this.onSubmitTransfer(e)}
                ></token-transfer-form>
                <token-transfer-list
                    .transfers=${this.transfers}
                    .party=${this.ledgerService?.party}
                    @accept-transfer=${(e: CustomEvent) =>
                        this.onAcceptTransfer(e)}
                    @reject-transfer=${(e: CustomEvent) =>
                        this.onRejectTransfer(e)}
                ></token-transfer-list>
            </div>
        `
    }
}
