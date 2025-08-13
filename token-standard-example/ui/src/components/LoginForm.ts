import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('login-form')
export class LoginForm extends LitElement {
    static styles = css`
        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-width: 300px;
        }

        input {
            padding: 0.5rem;
            font-size: 1rem;
        }

        button {
            padding: 0.5rem;
            font-size: 1rem;
            cursor: pointer;
        }
    `

    @state()
    private login: string = ''

    private handleInput(e: Event) {
        const target = e.target as HTMLInputElement
        this.login = target.value
    }

    private handleSubmit(e: Event) {
        e.preventDefault()
        this.dispatchEvent(
            new CustomEvent('login-submit', {
                detail: { login: this.login },
                bubbles: true,
                composed: true,
            })
        )
    }

    render() {
        return html`
            <form @submit=${this.handleSubmit}>
                <input
                    type="text"
                    .value=${this.login}
                    @input=${this.handleInput}
                    placeholder="Enter your login"
                    required
                />
                <button type="submit">Log In</button>
            </form>
        `
    }
}
