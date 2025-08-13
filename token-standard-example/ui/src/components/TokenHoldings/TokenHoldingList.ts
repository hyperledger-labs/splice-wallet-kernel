import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { ITokenHolding } from '../../ledger.service'

@customElement('token-holding-list')
export class TokenHoldingList extends LitElement {
    @property({ type: Array })
    holdings: ITokenHolding[] = []

    static styles = css`
        table {
            border-collapse: collapse;
            width: 100%;
        }

        th,
        td {
            border: 1px solid #ccc;
            padding: 0.5rem;
            text-align: left;
        }

        th {
            background-color: #f4f4f4;
        }
    `

    render() {
        return html`
            <table>
                <thead>
                    <tr>
                        <th>Instrument</th>
                        <th>Amount</th>
                        <th>Owner</th>
                        <th>Contract ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.holdings.map(
                        (h) => html`
                            <tr>
                                <td>${h.instrumentId.id}</td>
                                <td>${h.amount}</td>
                                <td>${h.owner}</td>
                                <!-- TODO make it class-->
                                <td style="font-size: 0.75rem">
                                    ${h.contractId}
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        `
    }
}
