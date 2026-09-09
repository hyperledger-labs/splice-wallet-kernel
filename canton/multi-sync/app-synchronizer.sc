// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Custom multi-sync bootstrap for LocalNet. Mounted over the fetched bundle's
// /app/app-synchronizer.sc by scripts/src/start-localnet.ts so the change
// survives a `yarn script:fetch:localnet` (the .localnet bundle is gitignored).
//
// TODO(#2283): this is a temporary workaround until we have a proper multi-synchronizer bootstrap script in the Canton repo
// In addition to bootstrapping the private app-synchronizer and connecting the
// app-provider and app-user participants, this enables the
// EnableMultiSynchronizer topology feature flag on both participants for the
// app- and global synchronizers. Protocol version 35 (the latest stable PV in
// Canton 3.5.8) enforces this flag for cross-synchronizer reassignment; without
// it the DvP settlement in example 17 / run-17 fails with
// "Multi-synchronizer feature flag is not enabled for synchronizer ...".

val appSynchronizerId = bootstrap.synchronizer(
  synchronizerName = "app-synchronizer",
  sequencers = Seq(`app-sequencer`),
  mediators = Seq(`app-mediator`),
  synchronizerOwners = Seq(`app-sequencer`),
  synchronizerThreshold = 1,
  staticSynchronizerParameters = StaticSynchronizerParameters.defaultsWithoutKMS(ProtocolVersion.latest),
).logical

`app-provider`.synchronizers.connect_local(`app-sequencer`, "app-synchronizer")
`app-user`.synchronizers.connect_local(`app-sequencer`, "app-synchronizer")

utils.retry_until_true {
  `app-provider`.synchronizers.active("app-synchronizer") &&
    `app-user`.synchronizers.active("app-synchronizer")
}

// Enable the multi-synchronizer topology feature flag on every synchronizer each
// participant is connected to (required for cross-synchronizer reassignment /
// DvP flows). Wait until each participant is connected to a synchronizer other
// than the freshly-created app-synchronizer (i.e. the global synchronizer, whose
// onboarding can lag behind this script, especially in CI) so none are missed.
val multiSyncParticipants = Seq(`app-provider`, `app-user`)

utils.retry_until_true {
  multiSyncParticipants.forall(
    _.synchronizers.list_connected().exists(_.synchronizerId != appSynchronizerId)
  )
}

val multiSyncFeatureFlag =
  Seq(SynchronizerTrustCertificate.ParticipantTopologyFeatureFlag.EnableMultiSynchronizer)
multiSyncParticipants.foreach { participant =>
  participant.synchronizers.list_connected().map(_.synchronizerId).distinct.foreach { sid =>
    participant.topology.synchronizer_trust_certificates
      .propose(participant, sid, featureFlags = multiSyncFeatureFlag)
  }
}
