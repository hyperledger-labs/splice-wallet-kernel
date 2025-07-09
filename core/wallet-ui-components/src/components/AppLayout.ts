import { LitElement, html, css, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?inline'
import defaultTheme from '../../themes/default.css?inline'

@customElement('app-layout')
export class AppLayout extends LitElement {
    @property({ type: String }) iconSrc: string = '/images/icon.png'
    @property({ type: String }) themeSrc?: string

    static styles = css`
        ${unsafeCSS(bootstrapCss)}
    `

    private customThemeCss: string | null = null

    async updated(changedProps: Map<string, unknown>) {
        if (changedProps.has('themeSrc')) {
            if (this.themeSrc) {
                try {
                    const res = await fetch(this.themeSrc)
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    this.customThemeCss = await res.text()
                } catch (err) {
                    console.warn(
                        `[app-layout] Failed to load theme from "${this.themeSrc}":`,
                        err
                    )
                    this.customThemeCss = null
                }
                this.requestUpdate()
            } else {
                this.customThemeCss = null
            }
        }
    }

    private get effectiveThemeCss(): string {
        return this.customThemeCss ?? defaultTheme
    }

    render() {
        return html`
            <style>
                ${unsafeCSS(this.effectiveThemeCss)}
            </style>

            <app-header .iconSrc=${this.iconSrc}></app-header>
            <div class="container" id="mainContent">
                <slot></slot>
            </div>
        `
    }
}
