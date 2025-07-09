import { NetworkConfig } from 'core-wallet-store'
import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('network-form')
export class NetworkForm extends LitElement {
    @property({ type: Object }) editingNetwork: NetworkConfig | null = null
    @property({ type: String }) authType: string = 'implicit'

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

    private getAuthField(field: string): string {
        if (!this.editingNetwork) return ''
        const auth = this.editingNetwork.auth
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (auth as any)?.[field] ?? ''
    }

    onAuthTypeChange(e: Event) {
        const select = e.target as HTMLSelectElement
        this.authType = select.value
    }

    handleSubmit(e: Event) {
        e.preventDefault()

        const form = e.target as HTMLFormElement
        const formData = new FormData(form)

        this.dispatchEvent(
            new CustomEvent('form-submit', {
                detail: formData,
                bubbles: true,
                composed: true,
            })
        )
    }

    render() {
        return html`
            <form @submit=${this.handleSubmit}>
                <input
                    name="name"
                    placeholder="Name"
                    .value=${this.editingNetwork?.name ?? ''}
                    required
                />
                <input
                    name="networkId"
                    placeholder="Network Id"
                    .value=${this.editingNetwork?.networkId ?? ''}
                    required
                />
                <input
                    name="description"
                    placeholder="Description"
                    .value=${this.editingNetwork?.description ?? ''}
                    required
                />
                <input
                    name="ledgerApi.baseurl"
                    placeholder="Ledger API Base Url"
                    .value=${this.editingNetwork?.ledgerApi?.baseUrl ?? ''}
                    required
                />

                <select
                    name="authType"
                    @change=${this.onAuthTypeChange}
                    .value=${this.authType}
                >
                    <option value="password">password</option>
                    <option value="implicit">implicit</option>
                </select>

                ${this.authType === 'implicit'
                    ? html`
                          <input
                              name="domain"
                              placeholder="Domain"
                              .value=${this.getAuthField('domain')}
                              required
                          />
                          <input
                              name="clientId"
                              placeholder="ClientId"
                              .value=${this.getAuthField('clientId')}
                              required
                          />
                          <input
                              name="scope"
                              placeholder="Scope"
                              .value=${this.getAuthField('scope')}
                              required
                          />
                          <input
                              name="audience"
                              placeholder="Audience"
                              .value=${this.getAuthField('audience')}
                              required
                          />
                      `
                    : html`
                          <input
                              name="tokenUrl"
                              placeholder="TokenUrl"
                              .value=${this.getAuthField('tokenUrl')}
                              required
                          />
                          <input
                              name="grantType"
                              placeholder="GrantType"
                              .value=${this.getAuthField('grantType')}
                              required
                          />
                          <input
                              name="scope"
                              placeholder="Scope"
                              .value=${this.getAuthField('scope')}
                              required
                          />
                          <input
                              name="audience"
                              placeholder="Audience"
                              .value=${this.getAuthField('audience')}
                              required
                          />
                      `}

                <div class="buttons">
                    <button type="submit">Save</button>
                    <button
                        type="button"
                        @click=${() => this.dispatchEvent(new Event('cancel'))}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        `
    }
}
