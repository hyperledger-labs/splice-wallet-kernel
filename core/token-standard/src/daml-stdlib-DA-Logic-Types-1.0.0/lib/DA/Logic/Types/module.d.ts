// Generated from DA/Logic/Types.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation';
import * as damlTypes from '@daml/types';
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger';

export declare type Formula<a> =
  |  { tag: 'Proposition'; value: a }
  |  { tag: 'Negation'; value: Formula<a> }
  |  { tag: 'Conjunction'; value: Formula<a>[] }
  |  { tag: 'Disjunction'; value: Formula<a>[] }
;

export declare const Formula :
  (<a>(a: damlTypes.Serializable<a>) => damlTypes.Serializable<Formula<a>>) & {
};

