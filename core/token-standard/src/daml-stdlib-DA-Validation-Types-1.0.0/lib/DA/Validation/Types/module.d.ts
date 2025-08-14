// Generated from DA/Validation/Types.daml
/* eslint-disable @typescript-eslint/camelcase */

import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger'

import * as pkgbde4bd30749e99603e5afa354706608601029e225d4983324d617825b634253a from '@daml.js/daml-stdlib-DA-NonEmpty-Types-1.0.0'

export declare type Validation<errs, a> =
    | {
          tag: 'Errors'
          value: pkgbde4bd30749e99603e5afa354706608601029e225d4983324d617825b634253a.DA.NonEmpty.Types.NonEmpty<errs>
      }
    | { tag: 'Success'; value: a }

export declare const Validation: (<errs, a>(
    errs: damlTypes.Serializable<errs>,
    a: damlTypes.Serializable<a>
) => damlTypes.Serializable<Validation<errs, a>>) & {}
