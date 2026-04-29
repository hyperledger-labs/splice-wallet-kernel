// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

bootstrap.synchronizer(
  synchronizerName = "app-synchronizer",
  sequencers = Seq(`app-sequencer`),
  mediators = Seq(`app-mediator`),
  synchronizerOwners = Seq(`app-sequencer`),
  synchronizerThreshold = 1,
  staticSynchronizerParameters = StaticSynchronizerParameters.defaultsWithoutKMS(ProtocolVersion.latest),
)

// Connect app-provider to the new synchronizer.
// TODO: app-user is intentionally NOT connected to app-synchronizer so that
// the SDK (which picks connectedSynchronizers[0]) always selects global-domain.
// This is a temporary workaround until we have a better way to select synchronizers in the SDK.
`app-provider`.synchronizers.connect_local(`app-sequencer`, "app-synchronizer")

// Wait for app-provider to be active on app-synchronizer
utils.retry_until_true {
  `app-provider`.synchronizers.active("app-synchronizer")
}

// Vet packages on app-synchronizer for app-provider.
// The Splice app already uploaded DARs and vetted them on global-domain.
// We replicate the vetting from the global-domain synchronizer store to
// app-synchronizer so that the synchronizer is fully functional.
val appSyncId = `app-provider`.synchronizers.list_connected()
  .find(_.synchronizerAlias.unwrap == "app-synchronizer")
  .getOrElse(throw new RuntimeException("app-synchronizer not found in connected synchronizers"))
  .synchronizerId

val globalSyncId = `app-provider`.synchronizers.list_connected()
  .find(_.synchronizerAlias.unwrap == "global-domain")
  .getOrElse(throw new RuntimeException("global-domain not found in connected synchronizers"))
  .synchronizerId

for (participant <- Seq(`app-provider`)) {
  val vettedFromGlobal = participant.topology.vetted_packages
    .list(store = Some(TopologyStoreId.Synchronizer(globalSyncId)), filterParticipant = participant.id.filterString)
    .flatMap(_.item.packages)

  if (vettedFromGlobal.nonEmpty) {
    logger.info(s"Vetting ${vettedFromGlobal.size} packages on app-synchronizer for ${participant.name}")
    participant.topology.vetted_packages.propose_delta(
      participant = participant.id,
      store = appSyncId,
      adds = vettedFromGlobal.toSeq,
    )
  }
}

// Wait for vetting topology to propagate
utils.retry_until_true {
  val providerVetted = `app-provider`.topology.vetted_packages
    .list(store = Some(appSyncId), filterParticipant = `app-provider`.id.filterString)
  providerVetted.nonEmpty && providerVetted.head.item.packages.nonEmpty
}

logger.info("app-synchronizer bootstrap with package vetting completed successfully")
