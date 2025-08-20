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
    private selectedInstrumentKey: string = ''

    @state()
    private amount = ''

    @state()
    private inputHoldingCids: string[] = []

    get instruments(): Record<string, { admin: string; id: string }> {
        const map: Record<string, { admin: string; id: string }> = {}
        for (const holding of this.holdings) {
            const admin = holding.instrumentId?.admin
            const id = holding.instrumentId?.id
            if (!admin || !id) continue
            const key = this.getInstrumentKey(admin, id)
            if (!(key in map)) map[key] = { admin, id } // keep first dedupe
        }
        return map
    }

    get selectedInstrument(): { admin: string; id: string } | undefined {
        return this.instruments[this.selectedInstrumentKey]
    }

    // Holdings filtered to the currently selected instrument
    get instrumentHoldings(): ITokenHolding[] {
        const instr = this.selectedInstrument
        if (!instr) return []
        return this.holdings.filter(
            (h) =>
                h.instrumentId?.admin === instr.admin &&
                h.instrumentId?.id === instr.id
        )
    }

    private getInstrumentKey(admin: string, id: string) {
        return `${admin}::${id}`
    }

    public clearForm() {
        this.recipient = ''
        this.selectedInstrumentKey = ''
        this.amount = ''
        this.inputHoldingCids = []
    }

    private async handleSubmit(e: Event) {
        e.preventDefault()
        this.dispatchEvent(
            new CustomEvent('submit-transfer', {
                detail: {
                    recipient: this.recipient,
                    instrumentId: this.selectedInstrument,
                    amount: this.amount,
                    inputHoldingCids: this.inputHoldingCids,
                },
                bubbles: true,
                composed: true,
            })
        )
    }

    render() {
        const instrumentEntries = Object.entries(this.instruments)

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
                    Instrument:
                    <select
                        .value=${this.selectedInstrumentKey}
                        @change=${(e: Event) => {
                            this.selectedInstrumentKey = (
                                e.target as HTMLSelectElement
                            ).value
                            this.inputHoldingCids = [] // clear selection when instrument changes
                        }}
                    >
                        <option value="" disabled hidden>Select holding</option>
                        ${instrumentEntries.map(
                            ([key, instr]) =>
                                html` <option value=${key}>
                                    ${instr.id} — ${instr.admin}
                                </option>`
                        )}
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

                <fieldset ?disabled=${!this.selectedInstrument}>
                    <legend>Select Holdings to use:</legend>
                    ${this.instrumentHoldings.map((h) => {
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
                                        const v = (e.target as HTMLInputElement)
                                            .value
                                        this.inputHoldingCids = (
                                            e.target as HTMLInputElement
                                        ).checked
                                            ? [...this.inputHoldingCids, v]
                                            : this.inputHoldingCids.filter(
                                                  (cid) => cid !== v
                                              )
                                    }}
                                />
                                ${h.instrumentId.id} — ${h.amount} (cid:
                                ${h.contractId})
                            </label>
                        `
                    })}
                </fieldset>

                <button type="submit">Transfer</button>
            </form>
        `
    }
}
