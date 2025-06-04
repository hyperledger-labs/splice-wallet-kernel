import { DarsAvailable } from '../generated-typings'

const darsAvailable: DarsAvailable = () => {
    return Promise.resolve({ dars: [] })
}

export default darsAvailable
