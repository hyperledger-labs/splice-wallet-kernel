import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { ITokenTransferInstruction } from '../../ledger.service'

@customElement('token-transfer-list')
export class TokenTransferList extends LitElement {
    static styles = css`
        .transfer-card {
            margin-top: 16px;
            border: 1px solid #ccc;
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1rem;
        }
    `

    @property({ type: String })
    party!: string
    @property()
    transfers: ITokenTransferInstruction[] = []

    isAdminSignatory(transfer: ITokenTransferInstruction): boolean {
        return transfer.transfer.instrumentId.admin === this.party
    }

    private onAccept(transfer: ITokenTransferInstruction) {
        this.dispatchEvent(
            new CustomEvent('accept-transfer', {
                detail: {
                    transfer,
                },
                bubbles: true,
                composed: true,
            })
        )
    }

    private onReject(transfer: ITokenTransferInstruction) {
        this.dispatchEvent(
            new CustomEvent('reject-transfer', {
                detail: {
                    transfer,
                },
                bubbles: true,
                composed: true,
            })
        )
    }

    render() {
        return html`
            <h2>Pending transfers</h2>
            ${this.transfers?.map?.(
                (transfer) => html`
                    <div class="transfer-card">
                        <div>
                            <strong>Sender:</strong> ${transfer.transfer.sender}
                        </div>
                        <div>
                            <strong>Receiver:</strong> ${transfer.transfer
                                .receiver}
                        </div>
                        <div>
                            <strong>Amount:</strong> ${transfer.transfer.amount}
                        </div>
                        <div>
                            <strong>Instrument:</strong> ${transfer.transfer
                                .instrumentId.id}
                        </div>

                        ${this.isAdminSignatory(transfer)
                            ? html`
                                  <button
                                      @click=${() => this.onAccept(transfer)}
                                  >
                                      Accept
                                  </button>
                                  <button
                                      @click=${() => this.onReject(transfer)}
                                  >
                                      Reject
                                  </button>
                              `
                            : ''}
                    </div>
                `
            )}
        `
    }
}
