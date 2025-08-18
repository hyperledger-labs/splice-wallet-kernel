import { LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import './components/WalletKernelConnector'
import './components/TokenStandardExample'

@customElement('exercise-app')
export class ExerciseApp extends LitElement {
    @state() sessionToken: string | undefined = undefined

    private onConnected(e: CustomEvent<{ sessionToken: string }>) {
        this.sessionToken = e.detail.sessionToken
    }

    render() {
        return html`
            <wallet-kernel-connector
                @connected=${this.onConnected}
            ></wallet-kernel-connector>
            ${this.sessionToken
                ? html` <token-standard-example
                      .sessionToken=${this.sessionToken}
                  ></token-standard-example>`
                : nothing}
        `
    }
}
