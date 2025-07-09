import { NetworkConfig } from 'core-wallet-store'
import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('network-table')
export class NetworkTable extends LitElement {
    @property({ type: Array }) networks: NetworkConfig[] = []

    static styles = css`
        div {
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }
        header {
            display: flex;
            align-items: center;
            height: 100px;
        }

        :host {
            display: block;
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }

        .table-wrapper {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--splice-wk-border-color, #ccc);
            border-radius: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid var(--splice-wk-border-color, #ccc);
        }

        tbody td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--splice-wk-border-color, #ccc);
        }

        tr:nth-child(even) {
            background-color: var(--splice-wk-background-color, none);
        }

        .actions button {
            margin-right: 4px;
            font-size: 0.8rem;
            padding: 4px 8px;
        }

        .modal {
            position: fixed;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: var(--splice-wk-background-color, none);
            padding: 1.5rem;
            border-radius: 8px;
            width: 400px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        .form {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        input,
        select {
            padding: 6px;
            font-size: 1rem;
        }

        .buttons {
            display: flex;
            justify-content: flex-end;
            margin-top: 1rem;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }
    `

    render() {
        return html`
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Description</th>
                        <th>Auth type</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.networks.map(
                        (net) => html`
                            <tr>
                                <td>${net.name}</td>
                                <td>${net.networkId}</td>
                                <td>${net.description}</td>
                                <td>${net.auth.type}</td>
                                <td class="actions">
                                    <button>Update</button>
                                    <button
                                        @click=${() =>
                                            this.dispatchEvent(
                                                new CustomEvent('delete', {
                                                    detail: net,
                                                })
                                            )}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>
        `
    }
}
