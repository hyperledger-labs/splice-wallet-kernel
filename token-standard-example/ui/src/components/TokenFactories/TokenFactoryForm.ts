// create-factory-form.ts
import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('token-factory-form')
export class CreateFactoryForm extends LitElement {
    @state() private symbol = ''

    private onInputSymbol(e: Event) {
        const target = e.target as HTMLInputElement
        this.symbol = target.value
    }

    private async onSubmit(e: Event) {
        console.log('onSubmit', this.symbol)
        e.preventDefault()
        this.dispatchEvent(
            new CustomEvent('submit-factory', {
                detail: { symbol: this.symbol },
            })
        )
    }

    public clearForm() {
        this.symbol = ''
    }

    render() {
        return html`
            <form @submit=${this.onSubmit}>
                <h3>Create Token Factory</h3>

                <label>
                    Symbol
                    <input
                        type="text"
                        .value=${this.symbol}
                        @input=${this.onInputSymbol}
                        placeholder="BTC"
                        autocomplete="off"
                    />
                </label>

                <button type="submit">Submit</button>
            </form>
        `
    }
}
