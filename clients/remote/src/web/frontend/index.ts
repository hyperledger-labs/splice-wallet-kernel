import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import 'core-wallet-ui-components'
import '/style.css'

@customElement('user-ui')
export class UserUI extends LitElement {
    protected render() {
        return html`<div>
            <user-ui-nav></user-ui-nav>
            <h1>User UI</h1>
            <swk-configuration></swk-configuration>
        </div>`
    }
}

@customElement('user-ui-nav')
export class UserUINav extends LitElement {
    static styles = css`
        nav {
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }

        .active {
            color: var(--splice-wk-text-color, black);
            font-weight: bold;
            text-decoration: underline;
        }

        a {
            color: grey;
        }
    `

    private isActive(path: string) {
        return { active: window.location.pathname === path }
    }

    protected render() {
        return html`<nav>
            <a href="/" class=${classMap(this.isActive('/'))}>Home</a>
            <a href="/wallets/" class=${classMap(this.isActive('/wallets/'))}
                >Wallets</a
            >
            <a href="/networks/" class=${classMap(this.isActive('/networks/'))}
                >Networks</a
            >
        </nav>`
    }
}
