import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './TokenFactoryForm'
import { ITokenTransferFactory, LedgerService } from '../../ledger.service'

@customElement('token-factories-page')
export class TokenFactoriesPage extends LitElement {
    @property({ attribute: false }) accessor ledgerService!: LedgerService

    connectedCallback() {
        super.connectedCallback()
        if (!this.ledgerService) {
            throw new Error(
                '<logged-in-view> requires `ledgerService` property'
            )
        }
    }

    @state()
    factories: ITokenTransferFactory[] = []

    firstUpdated(changedProps: Map<string, unknown>) {
        super.firstUpdated(changedProps)
        this.updateFactories()
    }

    private async updateFactories() {
        this.factories = await this.ledgerService.fetchTransferFactories()
    }

    private async onSubmitFactory(e: CustomEvent) {
        try {
            await this.ledgerService.createAndRegisterTransferFactory(
                e.detail.symbol
            )
            this.clearForm()
        } catch (error) {
            console.log(error)
            alert("Couldn't create the factory")
        }
    }

    private clearForm() {
        const formElement = this.renderRoot.querySelector('token-factory-form')
        // @ts-expect-error reason TBS
        if (formElement?.clearForm) {
            // @ts-expect-error reason TBS
            formElement.clearForm()
        }
    }

    render() {
        return html`
            <div>
                <h1>Token factories</h1>
                <token-factory-form
                    @submit-factory=${(e: CustomEvent) =>
                        this.onSubmitFactory(e)}
                ></token-factory-form>
            </div>
        `
    }
}
