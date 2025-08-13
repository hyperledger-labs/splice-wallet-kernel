import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { ITokenHolding } from '../../ledger.service'

@customElement('token-transfer-form')
export class TokenTransferForm extends LitElement {
    static styles = css`
        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        select[multiple] {
            height: 6rem;
        }
    `
    @property()
    holdings: ITokenHolding[] = []

    @state()
    private recipient = ''

    @state()
    private tokenType = 'BTC'

    @state()
    private amount = ''

    @state()
    private inputHoldingCids: string[] = []

    public clearForm() {
        this.recipient = ''
        this.tokenType = 'BTC'
        this.amount = ''
        this.inputHoldingCids = []
    }

    private async handleSubmit(e: Event) {
        e.preventDefault()
        this.dispatchEvent(
            new CustomEvent('submit-transfer', {
                detail: {
                    recipient: this.recipient,
                    token: this.tokenType,
                    amount: this.amount,
                    inputHoldingCids: this.inputHoldingCids,
                },
                bubbles: true,
                composed: true,
            })
        )
    }

    render() {
        return html`
            <h2>Transfer holdings</h2>
            <form @submit=${this.handleSubmit}>
                <label>
                    Recipient:
                    <input
                        type="text"
                        .value=${this.recipient}
                        @input=${(e: Event) => {
                            const target = e.target as HTMLInputElement
                            this.recipient = target.value
                        }}
                    />
                </label>

                <label>
                    Token Type:
                    <select
                        .value=${this.tokenType}
                        @change=${(e: Event) => {
                            const target = e.target as HTMLSelectElement
                            this.tokenType = target?.value
                            this.inputHoldingCids = []
                        }}
                    >
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                    </select>
                </label>

                <label>
                    Amount:
                    <!-- TODO maybe let's have decimals here derived from token -->
                    <input
                        type="number"
                        step="0.01"
                        .value=${this.amount}
                        @input=${(e: InputEvent) => {
                            const target = e.target as HTMLInputElement
                            this.amount = target.value
                        }}
                    />
                </label>

                <fieldset>
                    <legend>Select Holdings to Use:</legend>
                    ${this.holdings
                        .filter((h) => h.instrumentId.id === this.tokenType)
                        .map((h) => {
                            const checked = this.inputHoldingCids.includes(
                                h.contractId
                            )
                            return html`
                                <label>
                                    <input
                                        type="checkbox"
                                        .value=${h.contractId}
                                        ?checked=${checked}
                                        @change=${(e: Event) => {
                                            const target =
                                                e.target as HTMLInputElement
                                            if (target.checked) {
                                                this.inputHoldingCids = [
                                                    ...this.inputHoldingCids,
                                                    target.value,
                                                ]
                                            } else {
                                                this.inputHoldingCids =
                                                    this.inputHoldingCids.filter(
                                                        (cid) =>
                                                            cid !== target.value
                                                    )
                                            }
                                        }}
                                    />
                                    ${h.instrumentId.id} - ${h.amount}
                                </label>
                            `
                        })}
                </fieldset>

                <button type="submit">Transfer</button>
            </form>
        `
    }
}
