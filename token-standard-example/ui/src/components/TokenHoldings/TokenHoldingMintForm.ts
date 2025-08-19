import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { ITokenTransferFactory } from '../../ledger.service'

@customElement('token-holding-mint-form')
export class TokenHoldingMintForm extends LitElement {
    @property({ attribute: false }) parties: string[] = []
    @property({ attribute: false }) transferFactories: ITokenTransferFactory[] =
        []

    @state() private selectedParty = ''
    @state() private selectedSymbol = ''
    @state() private amount = ''

    private onPartyChange(e: Event) {
        const t = e.target as HTMLSelectElement
        this.selectedParty = t.value
    }

    private onSymbolChange(e: Event) {
        const t = e.target as HTMLSelectElement
        this.selectedSymbol = t.value
    }

    private onAmountInput(e: Event) {
        const t = e.target as HTMLInputElement
        this.amount = t.value
    }

    private onSubmit(e: Event) {
        e.preventDefault()

        if (!this.selectedParty || !this.selectedSymbol || !this.amount) {
            return
        }

        this.dispatchEvent(
            new CustomEvent('submit-mint', {
                detail: {
                    receiver: this.selectedParty,
                    symbol: this.selectedSymbol,
                    amount: this.amount,
                },
                bubbles: true,
                composed: true,
            })
        )
    }

    public clearForm() {
        this.selectedParty = ''
        this.selectedSymbol = ''
        this.amount = ''
    }

    render() {
        return html`
            <form @submit=${this.onSubmit}>
                <h3>Mint Tokens</h3>

                <label>
                    Party
                    <select
                        .value=${this.selectedParty}
                        @change=${this.onPartyChange}
                        required
                    >
                        <option value="" disabled selected>
                            Select a party
                        </option>
                        ${this.parties?.map?.(
                            (p) => html`<option value=${p}>${p}</option>`
                        )}
                    </select>
                </label>

                <label>
                    Token
                    <select
                        .value=${this.selectedSymbol}
                        @change=${this.onSymbolChange}
                        required
                    >
                        <option value="" disabled selected>
                            Select a token
                        </option>
                        ${this.transferFactories?.map?.(
                            (sym) =>
                                html`<option value=${sym.meta.values.symbol}>
                                    ${sym.meta.values.symbol}
                                </option>`
                        )}
                    </select>
                </label>

                <label>
                    Amount
                    <input
                        type="number"
                        step="any"
                        min="0"
                        .value=${this.amount}
                        @input=${this.onAmountInput}
                        placeholder="1.0"
                        required
                    />
                </label>

                <button type="submit">Submit</button>
            </form>
        `
    }
}
