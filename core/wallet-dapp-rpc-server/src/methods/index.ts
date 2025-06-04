import connect from './connect'
import addNetwork from './addNetwork'
import allocateParty from './allocateParty'
import removeParty from './removeParty'
import sign from './sign'
import prepareReturn from './prepareReturn'
import prepareExecute from './prepareExecute'
import ledgerApi from './ledgerApi'
import darsAvailable from './darsAvailable'

const methods = {
    connect,
    addNetwork,
    allocateParty,
    removeParty,
    sign,
    prepareReturn,
    prepareExecute,
    ledgerApi,
    darsAvailable,
}

export default methods
