import { Sign } from '../generated-typings'

const sign: Sign = (params) => {
    return Promise.resolve({ signature: '', party: '', signedBy: '' })
}

export default sign
