// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

interface components {
    schemas: {
        AllocateExternalPartyRequest: {
            synchronizer: string
            onboardingTransactions?: Array<
                components['schemas']['SignedTransaction']
            >
            multiHashSignatures?: Array<components['schemas']['Signature']>
            identityProviderId: string
        }
        AllocateExternalPartyResponse: { partyId: string }
        AllocatePartyRequest: {
            partyIdHint: string
            localMetadata?: components['schemas']['ObjectMeta']
            identityProviderId: string
            synchronizerId: string
            userId: string
        }
        AllocatePartyResponse: {
            partyDetails?: components['schemas']['PartyDetails']
        }
        ArchivedEvent: {
            offset: unknown
            nodeId: unknown
            contractId: string
            templateId: string
            witnessParties?: Array<string>
            packageName: string
            implementedInterfaces?: Array<string>
        }
        AssignCommand: { value: components['schemas']['AssignCommand1'] }
        AssignCommand1: {
            reassignmentId: string
            source: string
            target: string
        }
        CanActAs: { value: components['schemas']['CanActAs1'] }
        CanActAs1: { party: string }
        CanExecuteAs: { value: components['schemas']['CanExecuteAs1'] }
        CanExecuteAs1: { party: string }
        CanExecuteAsAnyParty: {
            value: components['schemas']['CanExecuteAsAnyParty1']
        }
        CanExecuteAsAnyParty1: unknown
        CanReadAs: { value: components['schemas']['CanReadAs1'] }
        CanReadAs1: { party: string }
        CanReadAsAnyParty: {
            value: components['schemas']['CanReadAsAnyParty1']
        }
        CanReadAsAnyParty1: unknown
        Command: unknown
        Command1: unknown
        Completion: { value: components['schemas']['Completion1'] }
        Completion1: {
            commandId: string
            status?: components['schemas']['JsStatus']
            updateId: string
            userId: string
            actAs?: Array<string>
            submissionId: string
            deduplicationPeriod: components['schemas']['DeduplicationPeriod1']
            traceContext?: components['schemas']['TraceContext']
            offset: unknown
            synchronizerTime?: components['schemas']['SynchronizerTime']
        }
        CompletionResponse: unknown
        CompletionStreamRequest: {
            userId: string
            parties?: Array<string>
            beginExclusive: unknown
        }
        CompletionStreamResponse: {
            completionResponse: components['schemas']['CompletionResponse']
        }
        ConnectedSynchronizer: {
            synchronizerAlias: string
            synchronizerId: string
            permission: string
        }
        CostEstimation: {
            estimationTimestamp?: string
            confirmationRequestTrafficCostEstimation: unknown
            confirmationResponseTrafficCostEstimation: unknown
            totalTrafficCostEstimation: unknown
        }
        CostEstimationHints: {
            disabled: boolean
            expectedSignatures?: Array<string>
        }
        CreateAndExerciseCommand: {
            templateId: string
            createArguments: unknown
            choice: string
            choiceArgument: unknown
        }
        CreateCommand: { templateId: string; createArguments: unknown }
        CreateIdentityProviderConfigRequest: {
            identityProviderConfig?: components['schemas']['IdentityProviderConfig']
        }
        CreateIdentityProviderConfigResponse: {
            identityProviderConfig?: components['schemas']['IdentityProviderConfig']
        }
        CreateUserRequest: {
            user?: components['schemas']['User']
            rights?: Array<components['schemas']['Right']>
        }
        CreateUserResponse: { user?: components['schemas']['User'] }
        CreatedEvent: {
            offset: unknown
            nodeId: unknown
            contractId: string
            templateId: string
            contractKey?: unknown
            createArgument?: unknown
            createdEventBlob: string
            interfaceViews?: Array<components['schemas']['JsInterfaceView']>
            witnessParties?: Array<string>
            signatories?: Array<string>
            observers?: Array<string>
            createdAt: string
            packageName: string
            representativePackageId: string
            acsDelta: boolean
        }
        CreatedTreeEvent: { value: components['schemas']['CreatedEvent'] }
        CumulativeFilter: {
            identifierFilter: components['schemas']['IdentifierFilter']
        }
        DeduplicationDuration: { value: components['schemas']['Duration'] }
        DeduplicationDuration1: { value: components['schemas']['Duration'] }
        DeduplicationDuration2: { value: components['schemas']['Duration'] }
        DeduplicationOffset: { value: unknown }
        DeduplicationOffset1: { value: unknown }
        DeduplicationOffset2: { value: unknown }
        DeduplicationPeriod: unknown
        DeduplicationPeriod1: unknown
        DeduplicationPeriod2: unknown
        DeleteIdentityProviderConfigResponse: unknown
        DisclosedContract: {
            templateId?: string
            contractId: string
            createdEventBlob: string
            synchronizerId: string
        }
        Duration: {
            seconds: unknown
            nanos: unknown
            unknownFields?: components['schemas']['UnknownFieldSet']
        }
        Empty: unknown
        Empty1: unknown
        Empty10: unknown
        Empty2: unknown
        Empty3: unknown
        Empty4: unknown
        Empty5: unknown
        Empty6: unknown
        Empty7: unknown
        Empty8: unknown
        Empty9: unknown
        Event: unknown
        EventFormat: {
            filtersByParty: components['schemas']['Map_Filters']
            filtersForAnyParty?: components['schemas']['Filters']
            verbose: boolean
        }
        ExecuteSubmissionAndWaitResponse: {
            updateId: string
            completionOffset: unknown
        }
        ExecuteSubmissionResponse: unknown
        ExerciseByKeyCommand: {
            templateId: string
            contractKey: unknown
            choice: string
            choiceArgument: unknown
        }
        ExerciseCommand: {
            templateId: string
            contractId: string
            choice: string
            choiceArgument: unknown
        }
        ExercisedEvent: {
            offset: unknown
            nodeId: unknown
            contractId: string
            templateId: string
            interfaceId?: string
            choice: string
            choiceArgument: unknown
            actingParties?: Array<string>
            consuming: boolean
            witnessParties?: Array<string>
            lastDescendantNodeId: unknown
            exerciseResult: unknown
            packageName: string
            implementedInterfaces?: Array<string>
            acsDelta: boolean
        }
        ExercisedTreeEvent: { value: components['schemas']['ExercisedEvent'] }
        ExperimentalCommandInspectionService: { supported: boolean }
        ExperimentalFeatures: {
            staticTime?: components['schemas']['ExperimentalStaticTime']
            commandInspectionService?: components['schemas']['ExperimentalCommandInspectionService']
        }
        ExperimentalStaticTime: { supported: boolean }
        FeaturesDescriptor: {
            experimental?: components['schemas']['ExperimentalFeatures']
            userManagement?: components['schemas']['UserManagementFeature']
            partyManagement?: components['schemas']['PartyManagementFeature']
            offsetCheckpoint?: components['schemas']['OffsetCheckpointFeature']
            packageFeature?: components['schemas']['PackageFeature']
        }
        Field: {
            varint?: Array<unknown>
            fixed64?: Array<unknown>
            fixed32?: Array<unknown>
            lengthDelimited?: Array<string>
        }
        FieldMask: {
            paths?: Array<string>
            unknownFields: components['schemas']['UnknownFieldSet']
        }
        Filters: {
            cumulative?: Array<components['schemas']['CumulativeFilter']>
        }
        GenerateExternalPartyTopologyRequest: {
            synchronizer: string
            partyHint: string
            publicKey?: components['schemas']['SigningPublicKey']
            localParticipantObservationOnly: boolean
            otherConfirmingParticipantUids?: Array<string>
            confirmationThreshold: unknown
            observingParticipantUids?: Array<string>
        }
        GenerateExternalPartyTopologyResponse: {
            partyId: string
            publicKeyFingerprint: string
            topologyTransactions?: Array<string>
            multiHash: string
        }
        GetActiveContractsRequest: {
            filter?: components['schemas']['TransactionFilter']
            verbose: boolean
            activeAtOffset: unknown
            eventFormat?: components['schemas']['EventFormat']
        }
        GetConnectedSynchronizersResponse: {
            connectedSynchronizers?: Array<
                components['schemas']['ConnectedSynchronizer']
            >
        }
        GetContractRequest: {
            contractId: string
            queryingParties?: Array<string>
        }
        GetContractResponse: {
            createdEvent?: components['schemas']['CreatedEvent']
        }
        GetEventsByContractIdRequest: {
            contractId: string
            eventFormat?: components['schemas']['EventFormat']
        }
        GetIdentityProviderConfigResponse: {
            identityProviderConfig?: components['schemas']['IdentityProviderConfig']
        }
        GetLatestPrunedOffsetsResponse: {
            participantPrunedUpToInclusive: unknown
            allDivulgedContractsPrunedUpToInclusive: unknown
        }
        GetLedgerApiVersionResponse: {
            version: string
            features?: components['schemas']['FeaturesDescriptor']
        }
        GetLedgerEndResponse: { offset: unknown }
        GetPackageStatusResponse: { packageStatus: string }
        GetParticipantIdResponse: { participantId: string }
        GetPartiesResponse: {
            partyDetails?: Array<components['schemas']['PartyDetails']>
        }
        GetPreferredPackageVersionResponse: {
            packagePreference?: components['schemas']['PackagePreference']
        }
        GetPreferredPackagesRequest: {
            packageVettingRequirements?: Array<
                components['schemas']['PackageVettingRequirement']
            >
            synchronizerId: string
            vettingValidAt?: string
        }
        GetPreferredPackagesResponse: {
            packageReferences?: Array<components['schemas']['PackageReference']>
            synchronizerId: string
        }
        GetTransactionByIdRequest: {
            updateId: string
            requestingParties?: Array<string>
            transactionFormat?: components['schemas']['TransactionFormat']
        }
        GetTransactionByOffsetRequest: {
            offset: unknown
            requestingParties?: Array<string>
            transactionFormat?: components['schemas']['TransactionFormat']
        }
        GetUpdateByIdRequest: {
            updateId: string
            updateFormat?: components['schemas']['UpdateFormat']
        }
        GetUpdateByOffsetRequest: {
            offset: unknown
            updateFormat?: components['schemas']['UpdateFormat']
        }
        GetUpdatesRequest: {
            beginExclusive: unknown
            endInclusive?: unknown
            filter?: components['schemas']['TransactionFilter']
            verbose: boolean
            updateFormat?: components['schemas']['UpdateFormat']
        }
        GetUserResponse: { user?: components['schemas']['User'] }
        GrantUserRightsRequest: {
            userId: string
            rights?: Array<components['schemas']['Right']>
            identityProviderId: string
        }
        GrantUserRightsResponse: {
            newlyGrantedRights?: Array<components['schemas']['Right']>
        }
        Identifier: {
            packageId: string
            moduleName: string
            entityName: string
        }
        IdentifierFilter: unknown
        IdentityProviderAdmin: {
            value: components['schemas']['IdentityProviderAdmin1']
        }
        IdentityProviderAdmin1: unknown
        IdentityProviderConfig: {
            identityProviderId: string
            isDeactivated: boolean
            issuer: string
            jwksUrl: string
            audience: string
        }
        InterfaceFilter: { value: components['schemas']['InterfaceFilter1'] }
        InterfaceFilter1: {
            interfaceId?: string
            includeInterfaceView: boolean
            includeCreatedEventBlob: boolean
        }
        JsActiveContract: {
            createdEvent: components['schemas']['CreatedEvent']
            synchronizerId: string
            reassignmentCounter: unknown
        }
        JsArchived: {
            archivedEvent: components['schemas']['ArchivedEvent']
            synchronizerId: string
        }
        JsAssignedEvent: {
            source: string
            target: string
            reassignmentId: string
            submitter: string
            reassignmentCounter: unknown
            createdEvent: components['schemas']['CreatedEvent']
        }
        JsAssignmentEvent: {
            source: string
            target: string
            reassignmentId: string
            submitter: string
            reassignmentCounter: unknown
            createdEvent: components['schemas']['CreatedEvent']
        }
        JsCantonError: {
            code: string
            cause: string
            correlationId?: string
            traceId?: string
            context: components['schemas']['Map_String']
            resources?: Array<components['schemas']['Tuple2_String_String']>
            errorCategory: unknown
            grpcCodeValue?: unknown
            retryInfo?: string
            definiteAnswer?: boolean
        }
        JsCommands: {
            commands?: Array<components['schemas']['Command']>
            commandId: string
            actAs?: Array<string>
            userId?: string
            readAs?: Array<string>
            workflowId?: string
            deduplicationPeriod?: components['schemas']['DeduplicationPeriod']
            minLedgerTimeAbs?: string
            minLedgerTimeRel?: components['schemas']['Duration']
            submissionId?: string
            disclosedContracts?: Array<
                components['schemas']['DisclosedContract']
            >
            synchronizerId?: string
            packageIdSelectionPreference?: Array<string>
            prefetchContractKeys?: Array<
                components['schemas']['PrefetchContractKey']
            >
        }
        JsContractEntry: unknown
        JsCreated: {
            createdEvent: components['schemas']['CreatedEvent']
            synchronizerId: string
        }
        JsEmpty: unknown
        JsExecuteSubmissionAndWaitForTransactionRequest: {
            preparedTransaction?: string
            partySignatures?: components['schemas']['PartySignatures']
            deduplicationPeriod: components['schemas']['DeduplicationPeriod2']
            submissionId: string
            userId: string
            hashingSchemeVersion: string
            minLedgerTime?: components['schemas']['MinLedgerTime']
            transactionFormat?: components['schemas']['TransactionFormat']
        }
        JsExecuteSubmissionAndWaitForTransactionResponse: {
            transaction: components['schemas']['JsTransaction']
        }
        JsExecuteSubmissionAndWaitRequest: {
            preparedTransaction?: string
            partySignatures?: components['schemas']['PartySignatures']
            deduplicationPeriod: components['schemas']['DeduplicationPeriod2']
            submissionId: string
            userId: string
            hashingSchemeVersion: string
            minLedgerTime?: components['schemas']['MinLedgerTime']
        }
        JsExecuteSubmissionRequest: {
            preparedTransaction?: string
            partySignatures?: components['schemas']['PartySignatures']
            deduplicationPeriod: components['schemas']['DeduplicationPeriod2']
            submissionId: string
            userId: string
            hashingSchemeVersion: string
            minLedgerTime?: components['schemas']['MinLedgerTime']
        }
        JsGetActiveContractsResponse: {
            workflowId: string
            contractEntry: components['schemas']['JsContractEntry']
        }
        JsGetEventsByContractIdResponse: {
            created?: components['schemas']['JsCreated']
            archived?: components['schemas']['JsArchived']
        }
        JsGetTransactionResponse: {
            transaction: components['schemas']['JsTransaction']
        }
        JsGetTransactionTreeResponse: {
            transaction: components['schemas']['JsTransactionTree']
        }
        JsGetUpdateResponse: { update: components['schemas']['Update'] }
        JsGetUpdateTreesResponse: { update: components['schemas']['Update1'] }
        JsGetUpdatesResponse: { update: components['schemas']['Update'] }
        JsIncompleteAssigned: {
            assignedEvent: components['schemas']['JsAssignedEvent']
        }
        JsIncompleteUnassigned: {
            createdEvent: components['schemas']['CreatedEvent']
            unassignedEvent: components['schemas']['UnassignedEvent']
        }
        JsInterfaceView: {
            interfaceId: string
            viewStatus: components['schemas']['JsStatus']
            viewValue?: unknown
        }
        JsPrepareSubmissionRequest: {
            userId: string
            commandId: string
            commands?: Array<components['schemas']['Command']>
            minLedgerTime?: components['schemas']['MinLedgerTime']
            actAs?: Array<string>
            readAs?: Array<string>
            disclosedContracts?: Array<
                components['schemas']['DisclosedContract']
            >
            synchronizerId: string
            packageIdSelectionPreference?: Array<string>
            verboseHashing: boolean
            prefetchContractKeys?: Array<
                components['schemas']['PrefetchContractKey']
            >
            maxRecordTime?: string
            estimateTrafficCost?: components['schemas']['CostEstimationHints']
        }
        JsPrepareSubmissionResponse: {
            preparedTransaction?: string
            preparedTransactionHash: string
            hashingSchemeVersion: string
            hashingDetails?: string
            costEstimation?: components['schemas']['CostEstimation']
        }
        JsReassignment: {
            updateId: string
            commandId: string
            workflowId: string
            offset: unknown
            events?: Array<components['schemas']['JsReassignmentEvent']>
            traceContext?: components['schemas']['TraceContext']
            recordTime: string
            synchronizerId: string
        }
        JsReassignmentEvent: unknown
        JsStatus: {
            code: unknown
            message: string
            details?: Array<components['schemas']['ProtoAny']>
        }
        JsSubmitAndWaitForReassignmentResponse: {
            reassignment: components['schemas']['JsReassignment']
        }
        JsSubmitAndWaitForTransactionRequest: {
            commands: components['schemas']['JsCommands']
            transactionFormat?: components['schemas']['TransactionFormat']
        }
        JsSubmitAndWaitForTransactionResponse: {
            transaction: components['schemas']['JsTransaction']
        }
        JsSubmitAndWaitForTransactionTreeResponse: {
            transactionTree: components['schemas']['JsTransactionTree']
        }
        JsTopologyTransaction: {
            updateId: string
            offset: unknown
            synchronizerId: string
            recordTime?: string
            events?: Array<components['schemas']['TopologyEvent']>
            traceContext?: components['schemas']['TraceContext']
        }
        JsTransaction: {
            updateId: string
            commandId: string
            workflowId: string
            effectiveAt: string
            events?: Array<components['schemas']['Event']>
            offset: unknown
            synchronizerId: string
            traceContext?: components['schemas']['TraceContext']
            recordTime: string
            externalTransactionHash?: string
        }
        JsTransactionTree: {
            updateId: string
            commandId: string
            workflowId: string
            effectiveAt?: string
            offset: unknown
            eventsById: components['schemas']['Map_Int_TreeEvent']
            synchronizerId: string
            traceContext?: components['schemas']['TraceContext']
            recordTime: string
        }
        JsUnassignedEvent: { value: components['schemas']['UnassignedEvent'] }
        Kind: unknown
        ListIdentityProviderConfigsResponse: {
            identityProviderConfigs?: Array<
                components['schemas']['IdentityProviderConfig']
            >
        }
        ListKnownPartiesResponse: {
            partyDetails?: Array<components['schemas']['PartyDetails']>
            nextPageToken: string
        }
        ListPackagesResponse: { packageIds?: Array<string> }
        ListUserRightsResponse: {
            rights?: Array<components['schemas']['Right']>
        }
        ListUsersResponse: {
            users?: Array<components['schemas']['User']>
            nextPageToken: string
        }
        ListVettedPackagesRequest: {
            packageMetadataFilter?: components['schemas']['PackageMetadataFilter']
            topologyStateFilter?: components['schemas']['TopologyStateFilter']
            pageToken: string
            pageSize: unknown
        }
        ListVettedPackagesResponse: {
            vettedPackages?: Array<components['schemas']['VettedPackages']>
            nextPageToken: string
        }
        Map_Filters: unknown
        Map_Int_Field: unknown
        Map_Int_TreeEvent: unknown
        Map_String: unknown
        MinLedgerTime: { time: components['schemas']['Time'] }
        MinLedgerTimeAbs: { value: string }
        MinLedgerTimeRel: { value: components['schemas']['Duration'] }
        NoPrior: unknown
        ObjectMeta: {
            resourceVersion: string
            annotations: components['schemas']['Map_String']
        }
        OffsetCheckpoint: { value: components['schemas']['OffsetCheckpoint1'] }
        OffsetCheckpoint1: {
            offset: unknown
            synchronizerTimes?: Array<components['schemas']['SynchronizerTime']>
        }
        OffsetCheckpoint2: { value: components['schemas']['OffsetCheckpoint1'] }
        OffsetCheckpoint3: { value: components['schemas']['OffsetCheckpoint1'] }
        OffsetCheckpointFeature: {
            maxOffsetCheckpointEmissionDelay?: components['schemas']['Duration']
        }
        Operation: unknown
        PackageFeature: { maxVettedPackagesPageSize: unknown }
        PackageMetadataFilter: {
            packageIds?: Array<string>
            packageNamePrefixes?: Array<string>
        }
        PackagePreference: {
            packageReference?: components['schemas']['PackageReference']
            synchronizerId: string
        }
        PackageReference: {
            packageId: string
            packageName: string
            packageVersion: string
        }
        PackageVettingRequirement: {
            parties?: Array<string>
            packageName: string
        }
        ParticipantAdmin: { value: components['schemas']['ParticipantAdmin1'] }
        ParticipantAdmin1: unknown
        ParticipantAuthorizationAdded: {
            value: components['schemas']['ParticipantAuthorizationAdded1']
        }
        ParticipantAuthorizationAdded1: {
            partyId: string
            participantId: string
            participantPermission: string
        }
        ParticipantAuthorizationChanged: {
            value: components['schemas']['ParticipantAuthorizationChanged1']
        }
        ParticipantAuthorizationChanged1: {
            partyId: string
            participantId: string
            participantPermission: string
        }
        ParticipantAuthorizationRevoked: {
            value: components['schemas']['ParticipantAuthorizationRevoked1']
        }
        ParticipantAuthorizationRevoked1: {
            partyId: string
            participantId: string
        }
        ParticipantAuthorizationTopologyFormat: { parties?: Array<string> }
        PartyDetails: {
            party: string
            isLocal: boolean
            localMetadata?: components['schemas']['ObjectMeta']
            identityProviderId: string
        }
        PartyManagementFeature: { maxPartiesPageSize: unknown }
        PartySignatures: {
            signatures?: Array<components['schemas']['SinglePartySignatures']>
        }
        PrefetchContractKey: { templateId?: string; contractKey: unknown }
        Prior: { value: unknown }
        PriorTopologySerial: { serial: components['schemas']['Serial'] }
        ProtoAny: {
            typeUrl: string
            value: string
            unknownFields: components['schemas']['UnknownFieldSet']
            valueDecoded?: string
        }
        Reassignment: { value: components['schemas']['JsReassignment'] }
        Reassignment1: { value: components['schemas']['JsReassignment'] }
        ReassignmentCommand: { command: components['schemas']['Command1'] }
        ReassignmentCommands: {
            workflowId: string
            userId: string
            commandId: string
            submitter: string
            submissionId: string
            commands?: Array<components['schemas']['ReassignmentCommand']>
        }
        RevokeUserRightsRequest: {
            userId: string
            rights?: Array<components['schemas']['Right']>
            identityProviderId: string
        }
        RevokeUserRightsResponse: {
            newlyRevokedRights?: Array<components['schemas']['Right']>
        }
        Right: { kind: components['schemas']['Kind'] }
        Serial: unknown
        Signature: {
            format: string
            signature: string
            signedBy: string
            signingAlgorithmSpec: string
        }
        SignedTransaction: {
            transaction: string
            signatures?: Array<components['schemas']['Signature']>
        }
        SigningPublicKey: { format: string; keyData: string; keySpec: string }
        SinglePartySignatures: {
            party: string
            signatures?: Array<components['schemas']['Signature']>
        }
        SubmitAndWaitForReassignmentRequest: {
            reassignmentCommands?: components['schemas']['ReassignmentCommands']
            eventFormat?: components['schemas']['EventFormat']
        }
        SubmitAndWaitResponse: { updateId: string; completionOffset: unknown }
        SubmitReassignmentRequest: {
            reassignmentCommands?: components['schemas']['ReassignmentCommands']
        }
        SubmitReassignmentResponse: unknown
        SubmitResponse: unknown
        SynchronizerTime: { synchronizerId: string; recordTime?: string }
        TemplateFilter: { value: components['schemas']['TemplateFilter1'] }
        TemplateFilter1: {
            templateId?: string
            includeCreatedEventBlob: boolean
        }
        Time: unknown
        TopologyEvent: { event: components['schemas']['TopologyEventEvent'] }
        TopologyEventEvent: unknown
        TopologyFormat: {
            includeParticipantAuthorizationEvents?: components['schemas']['ParticipantAuthorizationTopologyFormat']
        }
        TopologyStateFilter: {
            participantIds?: Array<string>
            synchronizerIds?: Array<string>
        }
        TopologyTransaction: {
            value: components['schemas']['JsTopologyTransaction']
        }
        TraceContext: { traceparent?: string; tracestate?: string }
        Transaction: { value: components['schemas']['JsTransaction'] }
        TransactionFilter: {
            filtersByParty: components['schemas']['Map_Filters']
            filtersForAnyParty?: components['schemas']['Filters']
        }
        TransactionFormat: {
            eventFormat?: components['schemas']['EventFormat']
            transactionShape: string
        }
        TransactionTree: { value: components['schemas']['JsTransactionTree'] }
        TreeEvent: unknown
        Tuple2_String_String: Array<string>
        UnassignCommand: { value: components['schemas']['UnassignCommand1'] }
        UnassignCommand1: { contractId: string; source: string; target: string }
        UnassignedEvent: {
            reassignmentId: string
            contractId: string
            templateId?: string
            source: string
            target: string
            submitter: string
            reassignmentCounter: unknown
            assignmentExclusivity?: string
            witnessParties?: Array<string>
            packageName: string
            offset: unknown
            nodeId: unknown
        }
        UnknownFieldSet: { fields: components['schemas']['Map_Int_Field'] }
        Unvet: { value: components['schemas']['Unvet1'] }
        Unvet1: { packages?: Array<components['schemas']['VettedPackagesRef']> }
        Update: unknown
        Update1: unknown
        UpdateFormat: {
            includeTransactions?: components['schemas']['TransactionFormat']
            includeReassignments?: components['schemas']['EventFormat']
            includeTopologyEvents?: components['schemas']['TopologyFormat']
        }
        UpdateIdentityProviderConfigRequest: {
            identityProviderConfig?: components['schemas']['IdentityProviderConfig']
            updateMask?: components['schemas']['FieldMask']
        }
        UpdateIdentityProviderConfigResponse: {
            identityProviderConfig?: components['schemas']['IdentityProviderConfig']
        }
        UpdatePartyDetailsRequest: {
            partyDetails?: components['schemas']['PartyDetails']
            updateMask?: components['schemas']['FieldMask']
        }
        UpdatePartyDetailsResponse: {
            partyDetails?: components['schemas']['PartyDetails']
        }
        UpdateUserIdentityProviderIdRequest: {
            userId: string
            sourceIdentityProviderId: string
            targetIdentityProviderId: string
        }
        UpdateUserIdentityProviderIdResponse: unknown
        UpdateUserRequest: {
            user?: components['schemas']['User']
            updateMask?: components['schemas']['FieldMask']
        }
        UpdateUserResponse: { user?: components['schemas']['User'] }
        UpdateVettedPackagesRequest: {
            changes?: Array<components['schemas']['VettedPackagesChange']>
            dryRun: boolean
            synchronizerId: string
            expectedTopologySerial?: components['schemas']['PriorTopologySerial']
            updateVettedPackagesForceFlags?: Array<string>
        }
        UpdateVettedPackagesResponse: {
            pastVettedPackages?: components['schemas']['VettedPackages']
            newVettedPackages?: components['schemas']['VettedPackages']
        }
        UploadDarFileResponse: unknown
        User: {
            id: string
            primaryParty: string
            isDeactivated: boolean
            metadata?: components['schemas']['ObjectMeta']
            identityProviderId: string
        }
        UserManagementFeature: {
            supported: boolean
            maxRightsPerUser: unknown
            maxUsersPageSize: unknown
        }
        Vet: { value: components['schemas']['Vet1'] }
        Vet1: {
            packages?: Array<components['schemas']['VettedPackagesRef']>
            newValidFromInclusive?: string
            newValidUntilExclusive?: string
        }
        VettedPackage: {
            packageId: string
            validFromInclusive?: string
            validUntilExclusive?: string
            packageName: string
            packageVersion: string
        }
        VettedPackages: {
            packages?: Array<components['schemas']['VettedPackage']>
            participantId: string
            synchronizerId: string
            topologySerial: unknown
        }
        VettedPackagesChange: { operation: components['schemas']['Operation'] }
        VettedPackagesRef: {
            packageId: string
            packageName: string
            packageVersion: string
        }
        WildcardFilter: { value: components['schemas']['WildcardFilter1'] }
        WildcardFilter1: { includeCreatedEventBlob: boolean }
    }
}

export type PostV2CommandsSubmitAndWait = {
    ledgerApi: {
        params: {
            resource: '/v2/commands/submit-and-wait'
            requestMethod: 'post'
            body: components['schemas']['JsCommands']
        }
        result: components['schemas']['SubmitAndWaitResponse']
    }
}
export type PostV2CommandsSubmitAndWaitForTransaction = {
    ledgerApi: {
        params: {
            resource: '/v2/commands/submit-and-wait-for-transaction'
            requestMethod: 'post'
            body: components['schemas']['JsSubmitAndWaitForTransactionRequest']
        }
        result: components['schemas']['JsSubmitAndWaitForTransactionResponse']
    }
}
export type PostV2CommandsSubmitAndWaitForReassignment = {
    ledgerApi: {
        params: {
            resource: '/v2/commands/submit-and-wait-for-reassignment'
            requestMethod: 'post'
            body: components['schemas']['SubmitAndWaitForReassignmentRequest']
        }
        result: components['schemas']['JsSubmitAndWaitForReassignmentResponse']
    }
}
export type PostV2CommandsSubmitAndWaitForTransactionTree = {
    ledgerApi: {
        params: {
            resource: '/v2/commands/submit-and-wait-for-transaction-tree'
            requestMethod: 'post'
            body: components['schemas']['JsCommands']
        }
        result: components['schemas']['JsSubmitAndWaitForTransactionTreeResponse']
    }
}
export type PostV2CommandsAsyncSubmit = {
    ledgerApi: {
        params: {
            resource: '/v2/commands/async/submit'
            requestMethod: 'post'
            body: components['schemas']['JsCommands']
        }
        result: components['schemas']['SubmitResponse']
    }
}
export type PostV2CommandsAsyncSubmitReassignment = {
    ledgerApi: {
        params: {
            resource: '/v2/commands/async/submit-reassignment'
            requestMethod: 'post'
            body: components['schemas']['SubmitReassignmentRequest']
        }
        result: components['schemas']['SubmitReassignmentResponse']
    }
}
export type PostV2CommandsCompletions = {
    ledgerApi: {
        params: {
            resource: '/v2/commands/completions'
            requestMethod: 'post'
            body: components['schemas']['CompletionStreamRequest']
        }
        result: Array<components['schemas']['CompletionStreamResponse']>
    }
}
export type PostV2EventsEventsByContractId = {
    ledgerApi: {
        params: {
            resource: '/v2/events/events-by-contract-id'
            requestMethod: 'post'
            body: components['schemas']['GetEventsByContractIdRequest']
        }
        result: components['schemas']['JsGetEventsByContractIdResponse']
    }
}
export type GetV2Version = {
    ledgerApi: {
        params: {
            resource: '/v2/version'
            requestMethod: 'get'
        }
        result: components['schemas']['GetLedgerApiVersionResponse']
    }
}
export type PostV2DarsValidate = {
    ledgerApi: {
        params: {
            resource: '/v2/dars/validate'
            requestMethod: 'post'
            body: unknown
        }
        result: unknown
    }
}
export type PostV2Dars = {
    ledgerApi: {
        params: {
            resource: '/v2/dars'
            requestMethod: 'post'
            body: unknown
        }
        result: components['schemas']['UploadDarFileResponse']
    }
}
export type GetV2Packages = {
    ledgerApi: {
        params: {
            resource: '/v2/packages'
            requestMethod: 'get'
        }
        result: components['schemas']['ListPackagesResponse']
    }
}
export type PostV2Packages = {
    ledgerApi: {
        params: {
            resource: '/v2/packages'
            requestMethod: 'post'
            body: unknown
        }
        result: components['schemas']['UploadDarFileResponse']
    }
}
export type GetV2PackagesPackageId = {
    ledgerApi: {
        params: {
            resource: '/v2/packages/{package-id}'
            requestMethod: 'get'
        }
        result: unknown
    }
}
export type GetV2PackagesPackageIdStatus = {
    ledgerApi: {
        params: {
            resource: '/v2/packages/{package-id}/status'
            requestMethod: 'get'
        }
        result: components['schemas']['GetPackageStatusResponse']
    }
}
export type GetV2PackageVetting = {
    ledgerApi: {
        params: {
            resource: '/v2/package-vetting'
            requestMethod: 'get'
            body: components['schemas']['ListVettedPackagesRequest']
        }
        result: components['schemas']['ListVettedPackagesResponse']
    }
}
export type PostV2PackageVetting = {
    ledgerApi: {
        params: {
            resource: '/v2/package-vetting'
            requestMethod: 'post'
            body: components['schemas']['UpdateVettedPackagesRequest']
        }
        result: components['schemas']['UpdateVettedPackagesResponse']
    }
}
export type GetV2Parties = {
    ledgerApi: {
        params: {
            resource: '/v2/parties'
            requestMethod: 'get'
        }
        result: components['schemas']['ListKnownPartiesResponse']
    }
}
export type PostV2Parties = {
    ledgerApi: {
        params: {
            resource: '/v2/parties'
            requestMethod: 'post'
            body: components['schemas']['AllocatePartyRequest']
        }
        result: components['schemas']['AllocatePartyResponse']
    }
}
export type PostV2PartiesExternalAllocate = {
    ledgerApi: {
        params: {
            resource: '/v2/parties/external/allocate'
            requestMethod: 'post'
            body: components['schemas']['AllocateExternalPartyRequest']
        }
        result: components['schemas']['AllocateExternalPartyResponse']
    }
}
export type GetV2PartiesParticipantId = {
    ledgerApi: {
        params: {
            resource: '/v2/parties/participant-id'
            requestMethod: 'get'
        }
        result: components['schemas']['GetParticipantIdResponse']
    }
}
export type GetV2PartiesParty = {
    ledgerApi: {
        params: {
            resource: '/v2/parties/{party}'
            requestMethod: 'get'
        }
        result: components['schemas']['GetPartiesResponse']
    }
}
export type PatchV2PartiesParty = {
    ledgerApi: {
        params: {
            resource: '/v2/parties/{party}'
            requestMethod: 'patch'
            body: components['schemas']['UpdatePartyDetailsRequest']
        }
        result: components['schemas']['UpdatePartyDetailsResponse']
    }
}
export type PostV2PartiesExternalGenerateTopology = {
    ledgerApi: {
        params: {
            resource: '/v2/parties/external/generate-topology'
            requestMethod: 'post'
            body: components['schemas']['GenerateExternalPartyTopologyRequest']
        }
        result: components['schemas']['GenerateExternalPartyTopologyResponse']
    }
}
export type PostV2StateActiveContracts = {
    ledgerApi: {
        params: {
            resource: '/v2/state/active-contracts'
            requestMethod: 'post'
            body: components['schemas']['GetActiveContractsRequest']
        }
        result: Array<components['schemas']['JsGetActiveContractsResponse']>
    }
}
export type GetV2StateConnectedSynchronizers = {
    ledgerApi: {
        params: {
            resource: '/v2/state/connected-synchronizers'
            requestMethod: 'get'
        }
        result: components['schemas']['GetConnectedSynchronizersResponse']
    }
}
export type GetV2StateLedgerEnd = {
    ledgerApi: {
        params: {
            resource: '/v2/state/ledger-end'
            requestMethod: 'get'
        }
        result: components['schemas']['GetLedgerEndResponse']
    }
}
export type GetV2StateLatestPrunedOffsets = {
    ledgerApi: {
        params: {
            resource: '/v2/state/latest-pruned-offsets'
            requestMethod: 'get'
        }
        result: components['schemas']['GetLatestPrunedOffsetsResponse']
    }
}
export type PostV2Updates = {
    ledgerApi: {
        params: {
            resource: '/v2/updates'
            requestMethod: 'post'
            body: components['schemas']['GetUpdatesRequest']
        }
        result: Array<components['schemas']['JsGetUpdatesResponse']>
    }
}
export type PostV2UpdatesFlats = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/flats'
            requestMethod: 'post'
            body: components['schemas']['GetUpdatesRequest']
        }
        result: Array<components['schemas']['JsGetUpdatesResponse']>
    }
}
export type PostV2UpdatesTrees = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/trees'
            requestMethod: 'post'
            body: components['schemas']['GetUpdatesRequest']
        }
        result: Array<components['schemas']['JsGetUpdateTreesResponse']>
    }
}
export type GetV2UpdatesTransactionTreeByOffsetOffset = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/transaction-tree-by-offset/{offset}'
            requestMethod: 'get'
        }
        result: components['schemas']['JsGetTransactionTreeResponse']
    }
}
export type PostV2UpdatesTransactionByOffset = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/transaction-by-offset'
            requestMethod: 'post'
            body: components['schemas']['GetTransactionByOffsetRequest']
        }
        result: components['schemas']['JsGetTransactionResponse']
    }
}
export type PostV2UpdatesUpdateByOffset = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/update-by-offset'
            requestMethod: 'post'
            body: components['schemas']['GetUpdateByOffsetRequest']
        }
        result: components['schemas']['JsGetUpdateResponse']
    }
}
export type PostV2UpdatesTransactionById = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/transaction-by-id'
            requestMethod: 'post'
            body: components['schemas']['GetTransactionByIdRequest']
        }
        result: components['schemas']['JsGetTransactionResponse']
    }
}
export type PostV2UpdatesUpdateById = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/update-by-id'
            requestMethod: 'post'
            body: components['schemas']['GetUpdateByIdRequest']
        }
        result: components['schemas']['JsGetUpdateResponse']
    }
}
export type GetV2UpdatesTransactionTreeByIdUpdateId = {
    ledgerApi: {
        params: {
            resource: '/v2/updates/transaction-tree-by-id/{update-id}'
            requestMethod: 'get'
        }
        result: components['schemas']['JsGetTransactionTreeResponse']
    }
}
export type GetV2Users = {
    ledgerApi: {
        params: {
            resource: '/v2/users'
            requestMethod: 'get'
        }
        result: components['schemas']['ListUsersResponse']
    }
}
export type PostV2Users = {
    ledgerApi: {
        params: {
            resource: '/v2/users'
            requestMethod: 'post'
            body: components['schemas']['CreateUserRequest']
        }
        result: components['schemas']['CreateUserResponse']
    }
}
export type GetV2UsersUserId = {
    ledgerApi: {
        params: {
            resource: '/v2/users/{user-id}'
            requestMethod: 'get'
        }
        result: components['schemas']['GetUserResponse']
    }
}
export type DeleteV2UsersUserId = {
    ledgerApi: {
        params: {
            resource: '/v2/users/{user-id}'
            requestMethod: 'delete'
        }
        result: unknown
    }
}
export type PatchV2UsersUserId = {
    ledgerApi: {
        params: {
            resource: '/v2/users/{user-id}'
            requestMethod: 'patch'
            body: components['schemas']['UpdateUserRequest']
        }
        result: components['schemas']['UpdateUserResponse']
    }
}
export type GetV2AuthenticatedUser = {
    ledgerApi: {
        params: {
            resource: '/v2/authenticated-user'
            requestMethod: 'get'
        }
        result: components['schemas']['GetUserResponse']
    }
}
export type GetV2UsersUserIdRights = {
    ledgerApi: {
        params: {
            resource: '/v2/users/{user-id}/rights'
            requestMethod: 'get'
        }
        result: components['schemas']['ListUserRightsResponse']
    }
}
export type PostV2UsersUserIdRights = {
    ledgerApi: {
        params: {
            resource: '/v2/users/{user-id}/rights'
            requestMethod: 'post'
            body: components['schemas']['GrantUserRightsRequest']
        }
        result: components['schemas']['GrantUserRightsResponse']
    }
}
export type PatchV2UsersUserIdRights = {
    ledgerApi: {
        params: {
            resource: '/v2/users/{user-id}/rights'
            requestMethod: 'patch'
            body: components['schemas']['RevokeUserRightsRequest']
        }
        result: components['schemas']['RevokeUserRightsResponse']
    }
}
export type PatchV2UsersUserIdIdentityProviderId = {
    ledgerApi: {
        params: {
            resource: '/v2/users/{user-id}/identity-provider-id'
            requestMethod: 'patch'
            body: components['schemas']['UpdateUserIdentityProviderIdRequest']
        }
        result: components['schemas']['UpdateUserIdentityProviderIdResponse']
    }
}
export type GetV2Idps = {
    ledgerApi: {
        params: {
            resource: '/v2/idps'
            requestMethod: 'get'
        }
        result: components['schemas']['ListIdentityProviderConfigsResponse']
    }
}
export type PostV2Idps = {
    ledgerApi: {
        params: {
            resource: '/v2/idps'
            requestMethod: 'post'
            body: components['schemas']['CreateIdentityProviderConfigRequest']
        }
        result: components['schemas']['CreateIdentityProviderConfigResponse']
    }
}
export type GetV2IdpsIdpId = {
    ledgerApi: {
        params: {
            resource: '/v2/idps/{idp-id}'
            requestMethod: 'get'
        }
        result: components['schemas']['GetIdentityProviderConfigResponse']
    }
}
export type DeleteV2IdpsIdpId = {
    ledgerApi: {
        params: {
            resource: '/v2/idps/{idp-id}'
            requestMethod: 'delete'
        }
        result: components['schemas']['DeleteIdentityProviderConfigResponse']
    }
}
export type PatchV2IdpsIdpId = {
    ledgerApi: {
        params: {
            resource: '/v2/idps/{idp-id}'
            requestMethod: 'patch'
            body: components['schemas']['UpdateIdentityProviderConfigRequest']
        }
        result: components['schemas']['UpdateIdentityProviderConfigResponse']
    }
}
export type PostV2InteractiveSubmissionPrepare = {
    ledgerApi: {
        params: {
            resource: '/v2/interactive-submission/prepare'
            requestMethod: 'post'
            body: components['schemas']['JsPrepareSubmissionRequest']
        }
        result: components['schemas']['JsPrepareSubmissionResponse']
    }
}
export type PostV2InteractiveSubmissionExecute = {
    ledgerApi: {
        params: {
            resource: '/v2/interactive-submission/execute'
            requestMethod: 'post'
            body: components['schemas']['JsExecuteSubmissionRequest']
        }
        result: components['schemas']['ExecuteSubmissionResponse']
    }
}
export type PostV2InteractiveSubmissionExecuteAndWait = {
    ledgerApi: {
        params: {
            resource: '/v2/interactive-submission/executeAndWait'
            requestMethod: 'post'
            body: components['schemas']['JsExecuteSubmissionAndWaitRequest']
        }
        result: components['schemas']['ExecuteSubmissionAndWaitResponse']
    }
}
export type PostV2InteractiveSubmissionExecuteAndWaitForTransaction = {
    ledgerApi: {
        params: {
            resource: '/v2/interactive-submission/executeAndWaitForTransaction'
            requestMethod: 'post'
            body: components['schemas']['JsExecuteSubmissionAndWaitForTransactionRequest']
        }
        result: components['schemas']['JsExecuteSubmissionAndWaitForTransactionResponse']
    }
}
export type GetV2InteractiveSubmissionPreferredPackageVersion = {
    ledgerApi: {
        params: {
            resource: '/v2/interactive-submission/preferred-package-version'
            requestMethod: 'get'
        }
        result: components['schemas']['GetPreferredPackageVersionResponse']
    }
}
export type PostV2InteractiveSubmissionPreferredPackages = {
    ledgerApi: {
        params: {
            resource: '/v2/interactive-submission/preferred-packages'
            requestMethod: 'post'
            body: components['schemas']['GetPreferredPackagesRequest']
        }
        result: components['schemas']['GetPreferredPackagesResponse']
    }
}
export type PostV2ContractsContractById = {
    ledgerApi: {
        params: {
            resource: '/v2/contracts/contract-by-id'
            requestMethod: 'post'
            body: components['schemas']['GetContractRequest']
        }
        result: components['schemas']['GetContractResponse']
    }
}

export type LedgerTypes =
    | PostV2CommandsSubmitAndWait
    | PostV2CommandsSubmitAndWaitForTransaction
    | PostV2CommandsSubmitAndWaitForReassignment
    | PostV2CommandsSubmitAndWaitForTransactionTree
    | PostV2CommandsAsyncSubmit
    | PostV2CommandsAsyncSubmitReassignment
    | PostV2CommandsCompletions
    | PostV2EventsEventsByContractId
    | GetV2Version
    | PostV2DarsValidate
    | PostV2Dars
    | GetV2Packages
    | PostV2Packages
    | GetV2PackagesPackageId
    | GetV2PackagesPackageIdStatus
    | GetV2PackageVetting
    | PostV2PackageVetting
    | GetV2Parties
    | PostV2Parties
    | PostV2PartiesExternalAllocate
    | GetV2PartiesParticipantId
    | GetV2PartiesParty
    | PatchV2PartiesParty
    | PostV2PartiesExternalGenerateTopology
    | PostV2StateActiveContracts
    | GetV2StateConnectedSynchronizers
    | GetV2StateLedgerEnd
    | GetV2StateLatestPrunedOffsets
    | PostV2Updates
    | PostV2UpdatesFlats
    | PostV2UpdatesTrees
    | GetV2UpdatesTransactionTreeByOffsetOffset
    | PostV2UpdatesTransactionByOffset
    | PostV2UpdatesUpdateByOffset
    | PostV2UpdatesTransactionById
    | PostV2UpdatesUpdateById
    | GetV2UpdatesTransactionTreeByIdUpdateId
    | GetV2Users
    | PostV2Users
    | GetV2UsersUserId
    | DeleteV2UsersUserId
    | PatchV2UsersUserId
    | GetV2AuthenticatedUser
    | GetV2UsersUserIdRights
    | PostV2UsersUserIdRights
    | PatchV2UsersUserIdRights
    | PatchV2UsersUserIdIdentityProviderId
    | GetV2Idps
    | PostV2Idps
    | GetV2IdpsIdpId
    | DeleteV2IdpsIdpId
    | PatchV2IdpsIdpId
    | PostV2InteractiveSubmissionPrepare
    | PostV2InteractiveSubmissionExecute
    | PostV2InteractiveSubmissionExecuteAndWait
    | PostV2InteractiveSubmissionExecuteAndWaitForTransaction
    | GetV2InteractiveSubmissionPreferredPackageVersion
    | PostV2InteractiveSubmissionPreferredPackages
    | PostV2ContractsContractById
