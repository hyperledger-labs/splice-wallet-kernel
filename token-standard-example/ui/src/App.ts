import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import './components/LoginForm'
import './components/LoggedInView'
import { LedgerService } from './ledger.service'

@customElement('exercise-app')
export class ExerciseApp extends LitElement {
    // TODO create an interface for it and use for props
    @state() ledgerService: LedgerService | null = null

    get isLoggedIn(): boolean {
        return !!this.ledgerService
    }

    private async handleLoginSubmit(e: CustomEvent) {
        const { login } = e.detail
        if (!login) {
            alert('Invalid login')
            return
        }
        try {
            const ledgerService = await LedgerService.create(login)
            this.ledgerService = ledgerService
        } catch (e) {
            console.log(e)
            alert("Couldn't connect to the ledger with user " + login)
        }
    }

    render() {
        return html`
            ${this.isLoggedIn
                ? html` <logged-in-view
                      .ledgerService=${this.ledgerService}
                  ></logged-in-view>`
                : html` <login-form
                      @login-submit=${this.handleLoginSubmit}
                  ></login-form>`}
        `
    }
}
