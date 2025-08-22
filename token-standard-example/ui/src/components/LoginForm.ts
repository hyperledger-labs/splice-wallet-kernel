import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import * as sdk from '@splice/sdk-dapp'

@customElement('login-form')
export class LoginForm extends LitElement {
    static styles = css`
        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-width: 320px;
        }
        select,
        button {
            padding: 0.5rem;
            font-size: 1rem;
        }
        .hint {
            color: #666;
            font-size: 0.9rem;
        }
    `

    @property({ type: Array })
    accounts: sdk.dappAPI.RequestAccountsResult = []

    @state() private login: string = ''

    protected updated(changed: Map<string, unknown>) {
        if (changed.has('accounts')) {
            const list = this.accounts ?? []
            if (!list.length) {
                this.login = ''
                return
            }

            const currentStillExists =
                this.login &&
                list.some((account) => String(account.partyId) === this.login)
            if (!this.login || !currentStillExists) {
                const primary = list.find((account) => account.primary)
                const chosen = primary ?? list[0]
                this.login = String(chosen.partyId ?? '')
            }
        }
    }

    private handleSelect = (e: Event) => {
        const select = e.target as HTMLSelectElement
        this.login = select.value
    }

    private handleSubmit = (e: Event) => {
        e.preventDefault()
        const account = this.accounts.find(
            (a) => String(a.partyId) === this.login
        )
        if (!account) {
            this.dispatchEvent(
                new CustomEvent('login-error', {
                    detail: { message: 'Please select an account' },
                    bubbles: true,
                    composed: true,
                })
            )
            return
        }

        this.dispatchEvent(
            new CustomEvent('login-submit', {
                detail: { login: this.login, partyId: this.login, account },
                bubbles: true,
                composed: true,
            })
        )
    }

    private renderOptionLabel(account: sdk.dappAPI.Wallet) {
        const primaryIndicator = account.primary ? '[PRIMARY] ' : ''
        return `${primaryIndicator}${account.hint} - ${account.partyId}`
    }

    render() {
        const hasAccounts =
            Array.isArray(this.accounts) && this.accounts.length > 0
        return html`
            <form @submit=${this.handleSubmit}>
                ${hasAccounts
                    ? html`
                          <label>
                              Select account
                              <select
                                  @change=${this.handleSelect}
                                  .value=${this.login}
                                  required
                              >
                                  ${this.accounts.map(
                                      (a) => html`
                                          <option value=${String(a.partyId)}>
                                              ${this.renderOptionLabel(a)}
                                          </option>
                                      `
                                  )}
                              </select>
                          </label>
                          <button type="submit" ?disabled=${!this.login}>
                              Log In
                          </button>
                      `
                    : html`
                          <div class="hint">
                              No accounts available. Connect to the wallet
                              kernel first.
                          </div>
                          <button type="submit" disabled>Log In</button>
                      `}
            </form>
        `
    }
}
