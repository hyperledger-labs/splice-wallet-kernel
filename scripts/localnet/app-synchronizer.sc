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

// Connect both app-provider and app-user to the new synchronizer.
// Both participants need to be connected so that multi-synchronizer examples
// (e.g. example 15) can discover and use the app-synchronizer from either participant.
//
// The global domain is connected first (before this bootstrap script runs),
// so connectedSynchronizers[0] remains global for both participants — the
// default synchronizer selection is unaffected.
`app-provider`.synchronizers.connect_local(`app-sequencer`, "app-synchronizer")
`app-user`.synchronizers.connect_local(`app-sequencer`, "app-synchronizer")

// Wait for both participants to be active on app-synchronizer
utils.retry_until_true {
  `app-provider`.synchronizers.active("app-synchronizer")
}
utils.retry_until_true {
  `app-user`.synchronizers.active("app-synchronizer")
}

// Vet packages on app-synchronizer for both participants.
// The Splice app already uploaded DARs and vetted them on global-domain.
// We replicate the vetting from both the Authorized store and the global
// synchronizer store to app-synchronizer.  Reading only from the Authorized
// store is not sufficient: packages such as splice-wallet are vetted on
// global-domain by the Splice app initialisation and therefore live in the
// global synchronizer topology store, not in the local Authorized store.
val appSyncId = `app-provider`.synchronizers.list_connected()
  .find(_.synchronizerAlias.unwrap == "app-synchronizer")
  .getOrElse(throw new RuntimeException("app-synchronizer not found in connected synchronizers"))
  .synchronizerId

val globalSyncId = `app-provider`.synchronizers.list_connected()
  .find(_.synchronizerAlias.unwrap != "app-synchronizer")
  .getOrElse(throw new RuntimeException("global synchronizer not found in connected synchronizers"))
  .synchronizerId

for (participant <- Seq(`app-provider`, `app-user`)) {
  val vettedFromAuthorized = participant.topology.vetted_packages
    .list(store = Some(TopologyStoreId.Authorized), filterParticipant = participant.id.filterString)
    .flatMap(_.item.packages)

  val vettedFromGlobal = participant.topology.vetted_packages
    .list(store = Some(globalSyncId), filterParticipant = participant.id.filterString)
    .flatMap(_.item.packages)

  // Deduplicate by packageId so that packages present in both stores are
  // only proposed once.
  val allVetted = (vettedFromAuthorized ++ vettedFromGlobal)
    .groupBy(_.packageId).values.map(_.head).toSeq

  if (allVetted.nonEmpty) {
    logger.info(s"Vetting ${allVetted.size} packages on app-synchronizer for ${participant.name}")
    participant.topology.vetted_packages.propose_delta(
      participant = participant.id,
      store = appSyncId,
      adds = allVetted,
    )
  }
}

// Wait for vetting topology to propagate for both participants
utils.retry_until_true {
  val providerVetted = `app-provider`.topology.vetted_packages
    .list(store = Some(appSyncId), filterParticipant = `app-provider`.id.filterString)
  providerVetted.nonEmpty && providerVetted.head.item.packages.nonEmpty
}
utils.retry_until_true {
  val userVetted = `app-user`.topology.vetted_packages
    .list(store = Some(appSyncId), filterParticipant = `app-user`.id.filterString)
  userVetted.nonEmpty && userVetted.head.item.packages.nonEmpty
}

logger.info("app-synchronizer bootstrap with package vetting completed successfully for app-provider and app-user")
