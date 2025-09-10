"use strict";
/* eslint-disable-next-line no-unused-vars */
function __export(m) {
/* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable-next-line no-unused-vars */
var jtv = require('@mojotech/json-type-validation');
/* eslint-disable-next-line no-unused-vars */
var damlTypes = require('@daml/types');
/* eslint-disable-next-line no-unused-vars */
var damlLedger = require('@daml/ledger');

var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0');

var Splice_Api_Token_AllocationV1 = require('../../../../Splice/Api/Token/AllocationV1/module');
var Splice_Api_Token_HoldingV1 = require('../../../../Splice/Api/Token/HoldingV1/module');
var Splice_Api_Token_MetadataV1 = require('../../../../Splice/Api/Token/MetadataV1/module');

exports.AllocationFactory = damlTypes.assembleInterface(
  'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.AllocationInstructionV1:AllocationFactory',
  function () { return exports.AllocationFactoryView; },
  {
    Archive: {
      template: function () { return exports.AllocationFactory; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder; }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.Unit.decoder; }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    AllocationFactory_Allocate: {
      template: function () { return exports.AllocationFactory; },
      choiceName: 'AllocationFactory_Allocate',
      argumentDecoder: damlTypes.lazyMemo(function () { return exports.AllocationFactory_Allocate.decoder; }),
      argumentEncode: function (__typed__) { return exports.AllocationFactory_Allocate.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () { return exports.AllocationInstructionResult.decoder; }),
      resultEncode: function (__typed__) { return exports.AllocationInstructionResult.encode(__typed__); },
    },
    AllocationFactory_PublicFetch: {
      template: function () { return exports.AllocationFactory; },
      choiceName: 'AllocationFactory_PublicFetch',
      argumentDecoder: damlTypes.lazyMemo(function () { return exports.AllocationFactory_PublicFetch.decoder; }),
      argumentEncode: function (__typed__) { return exports.AllocationFactory_PublicFetch.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () { return exports.AllocationFactoryView.decoder; }),
      resultEncode: function (__typed__) { return exports.AllocationFactoryView.encode(__typed__); },
    },
  });


exports.AllocationInstruction = damlTypes.assembleInterface(
  'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.AllocationInstructionV1:AllocationInstruction',
  function () { return exports.AllocationInstructionView; },
  {
    Archive: {
      template: function () { return exports.AllocationInstruction; },
      choiceName: 'Archive',
      argumentDecoder: damlTypes.lazyMemo(function () { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.decoder; }),
      argumentEncode: function (__typed__) { return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () { return damlTypes.Unit.decoder; }),
      resultEncode: function (__typed__) { return damlTypes.Unit.encode(__typed__); },
    },
    AllocationInstruction_Withdraw: {
      template: function () { return exports.AllocationInstruction; },
      choiceName: 'AllocationInstruction_Withdraw',
      argumentDecoder: damlTypes.lazyMemo(function () { return exports.AllocationInstruction_Withdraw.decoder; }),
      argumentEncode: function (__typed__) { return exports.AllocationInstruction_Withdraw.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () { return exports.AllocationInstructionResult.decoder; }),
      resultEncode: function (__typed__) { return exports.AllocationInstructionResult.encode(__typed__); },
    },
    AllocationInstruction_Update: {
      template: function () { return exports.AllocationInstruction; },
      choiceName: 'AllocationInstruction_Update',
      argumentDecoder: damlTypes.lazyMemo(function () { return exports.AllocationInstruction_Update.decoder; }),
      argumentEncode: function (__typed__) { return exports.AllocationInstruction_Update.encode(__typed__); },
      resultDecoder: damlTypes.lazyMemo(function () { return exports.AllocationInstructionResult.decoder; }),
      resultEncode: function (__typed__) { return exports.AllocationInstructionResult.encode(__typed__); },
    },
  });



exports.AllocationInstructionResult_Output = {
  decoder: damlTypes.lazyMemo(function () { return jtv.oneOf(jtv.object({tag: jtv.constant('AllocationInstructionResult_Pending'), value: exports.AllocationInstructionResult_Output.AllocationInstructionResult_Pending.decoder, }), jtv.object({tag: jtv.constant('AllocationInstructionResult_Completed'), value: exports.AllocationInstructionResult_Output.AllocationInstructionResult_Completed.decoder, }), jtv.object({tag: jtv.constant('AllocationInstructionResult_Failed'), value: damlTypes.Unit.decoder, })); }),
  encode: function (__typed__) {
  switch(__typed__.tag) {
    case 'AllocationInstructionResult_Pending': return {tag: __typed__.tag, value: exports.AllocationInstructionResult_Output.AllocationInstructionResult_Pending.encode(__typed__.value)};
    case 'AllocationInstructionResult_Completed': return {tag: __typed__.tag, value: exports.AllocationInstructionResult_Output.AllocationInstructionResult_Completed.encode(__typed__.value)};
    case 'AllocationInstructionResult_Failed': return {tag: __typed__.tag, value: damlTypes.Unit.encode(__typed__.value)};
    default: throw 'unrecognized type tag: ' + __typed__.tag + ' while serializing a value of type AllocationInstructionResult_Output';
  }
}
,
  AllocationInstructionResult_Pending:({
    decoder: damlTypes.lazyMemo(function () { return jtv.object({allocationInstructionCid: damlTypes.ContractId(exports.AllocationInstruction).decoder, }); }),
    encode: function (__typed__) {
  return {
    allocationInstructionCid: damlTypes.ContractId(exports.AllocationInstruction).encode(__typed__.allocationInstructionCid),
  };
}
,
  }),
  AllocationInstructionResult_Completed:({
    decoder: damlTypes.lazyMemo(function () { return jtv.object({allocationCid: damlTypes.ContractId(Splice_Api_Token_AllocationV1.Allocation).decoder, }); }),
    encode: function (__typed__) {
  return {
    allocationCid: damlTypes.ContractId(Splice_Api_Token_AllocationV1.Allocation).encode(__typed__.allocationCid),
  };
}
,
  }),
};







exports.AllocationInstructionResult = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({output: exports.AllocationInstructionResult_Output.decoder, senderChangeCids: damlTypes.List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)).decoder, meta: Splice_Api_Token_MetadataV1.Metadata.decoder, }); }),
  encode: function (__typed__) {
  return {
    output: exports.AllocationInstructionResult_Output.encode(__typed__.output),
    senderChangeCids: damlTypes.List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)).encode(__typed__.senderChangeCids),
    meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
  };
}
,
};



exports.AllocationFactory_PublicFetch = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({expectedAdmin: damlTypes.Party.decoder, actor: damlTypes.Party.decoder, }); }),
  encode: function (__typed__) {
  return {
    expectedAdmin: damlTypes.Party.encode(__typed__.expectedAdmin),
    actor: damlTypes.Party.encode(__typed__.actor),
  };
}
,
};



exports.AllocationFactory_Allocate = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({expectedAdmin: damlTypes.Party.decoder, allocation: Splice_Api_Token_AllocationV1.AllocationSpecification.decoder, requestedAt: damlTypes.Time.decoder, inputHoldingCids: damlTypes.List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)).decoder, extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.decoder, }); }),
  encode: function (__typed__) {
  return {
    expectedAdmin: damlTypes.Party.encode(__typed__.expectedAdmin),
    allocation: Splice_Api_Token_AllocationV1.AllocationSpecification.encode(__typed__.allocation),
    requestedAt: damlTypes.Time.encode(__typed__.requestedAt),
    inputHoldingCids: damlTypes.List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)).encode(__typed__.inputHoldingCids),
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.encode(__typed__.extraArgs),
  };
}
,
};



exports.AllocationFactoryView = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({admin: damlTypes.Party.decoder, meta: Splice_Api_Token_MetadataV1.Metadata.decoder, }); }),
  encode: function (__typed__) {
  return {
    admin: damlTypes.Party.encode(__typed__.admin),
    meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
  };
}
,
};



exports.AllocationInstruction_Update = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({extraActors: damlTypes.List(damlTypes.Party).decoder, extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.decoder, }); }),
  encode: function (__typed__) {
  return {
    extraActors: damlTypes.List(damlTypes.Party).encode(__typed__.extraActors),
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.encode(__typed__.extraArgs),
  };
}
,
};



exports.AllocationInstruction_Withdraw = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.decoder, }); }),
  encode: function (__typed__) {
  return {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.encode(__typed__.extraArgs),
  };
}
,
};



exports.AllocationInstructionView = {
  decoder: damlTypes.lazyMemo(function () { return jtv.object({originalInstructionCid: jtv.Decoder.withDefault(null, damlTypes.Optional(damlTypes.ContractId(exports.AllocationInstruction)).decoder), allocation: Splice_Api_Token_AllocationV1.AllocationSpecification.decoder, pendingActions: damlTypes.Map(damlTypes.Party, damlTypes.Text).decoder, requestedAt: damlTypes.Time.decoder, inputHoldingCids: damlTypes.List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)).decoder, meta: Splice_Api_Token_MetadataV1.Metadata.decoder, }); }),
  encode: function (__typed__) {
  return {
    originalInstructionCid: damlTypes.Optional(damlTypes.ContractId(exports.AllocationInstruction)).encode(__typed__.originalInstructionCid),
    allocation: Splice_Api_Token_AllocationV1.AllocationSpecification.encode(__typed__.allocation),
    pendingActions: damlTypes.Map(damlTypes.Party, damlTypes.Text).encode(__typed__.pendingActions),
    requestedAt: damlTypes.Time.encode(__typed__.requestedAt),
    inputHoldingCids: damlTypes.List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)).encode(__typed__.inputHoldingCids),
    meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
  };
}
,
};

