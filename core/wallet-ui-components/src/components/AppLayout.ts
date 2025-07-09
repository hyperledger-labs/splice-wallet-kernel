import { LitElement, html, css, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import bootstrapCss from 'bootstrap/dist/css/bootstrap.min.css?inline'
import defaultTheme from '../../themes/default.css?inline'

@customElement('app-layout')
export class AppLayout extends LitElement {
    @property({ type: String }) iconSrc: string = '/images/icon.png'
    @property({ type: String }) themeSrc?: string

    static styles = css`
        ${unsafeCSS(bootstrapCss.replaceAll(/:root/g, ':root,:host'))}

        :host {
            --bs-body-color: var(--splice-wk-text-color);

            margin: 0;
            font-family: var(--bs-body-font-family);
            font-size: var(--bs-body-font-size);
            font-weight: var(--bs-body-font-weight);
            line-height: var(--bs-body-line-height);
            color: var(--bs-body-color);
            text-align: var(--bs-body-text-align);
            background-color: var(--bs-body-bg);
            -webkit-text-size-adjust: 100%;
            -webkit-tap-highlight-color: transparent;
        }
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
