import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('app-header')
export class AppHeader extends LitElement {
    @property({ type: String }) iconSrc: string = 'images/icon.png'

    // Prevent shadow DOM so external CSS applies
    createRenderRoot() {
        return this
    }

    render() {
        return html`
            <div
                class="header d-flex justify-content-between align-items-center"
            >
                <h2>
                    <img
                        src="${this.iconSrc}"
                        alt="Icon"
                        width="24"
                        height="24"
                    />
                    Splice Wallet
                </h2>
                <div>
                    <button
                        class="btn btn-outline-secondary btn-sm"
                        id="settingsButton"
                    >
                        Settings
                    </button>
                    <button
                        class="btn btn-outline-secondary btn-sm"
                        id="logoutButton"
                    >
                        Logout
                    </button>
                </div>
            </div>
        `
    }
}
