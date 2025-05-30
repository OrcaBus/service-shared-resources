import { AuroraPostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { SchemaRegistryProps } from './constructs/schema-registry';
import { StageName } from '@orcabus/platform-cdk-constructs/utils';
import { SharedStackProps } from './stack';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { VpcLookupOptions } from 'aws-cdk-lib/aws-ec2';
import { EventBusProps } from './constructs/event-bus';
import {
  BETA_ENVIRONMENT,
  GAMMA_ENVIRONMENT,
  PROD_ENVIRONMENT,
} from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import { ComputeProps } from './constructs/compute';
import { EventSourceProps } from './constructs/event-source';
import { EventDLQProps } from './constructs/event-dlq';
import { ConfigurableDatabaseProps } from './constructs/database';
const SHARED_SECURITY_GROUP_NAME = 'OrcaBusSharedComputeSecurityGroup';

const eventSchemaRegistryName = 'orcabus.events';
const dataSchemaRegistryName = 'orcabus.data';
const eventBusName = 'OrcaBusMain';
const eventSourceQueueName = 'orcabus-event-source-queue';

const vpcName = 'main-vpc';
const vpcStackName = 'networking';
const vpcProps: VpcLookupOptions = {
  vpcName: vpcName,
  tags: {
    Stack: vpcStackName,
  },
};

const oncoanalyserBucket: Record<StageName, string> = {
  BETA: 'umccr-temp-dev',
  GAMMA: 'umccr-temp-stg',
  PROD: 'org.umccr.data.oncoanalyser',
};

const icav2PipelineCacheBucket: Record<StageName, string> = {
  BETA: 'pipeline-dev-cache-503977275616-ap-southeast-2',
  GAMMA: 'pipeline-stg-cache-503977275616-ap-southeast-2',
  PROD: 'pipeline-prod-cache-503977275616-ap-southeast-2',
};

// The archive bucket. Noting that this is only present for prod data.
const PROD_ICAV2_ARCHIVE_ANALYSIS_BUCKET = 'archive-prod-analysis-503977275616-ap-southeast-2';

// The fastq bucket. Noting that this is only present for prod data.
const PROD_ICAV2_ARCHIVE_FASTQ_BUCKET = 'archive-prod-fastq-503977275616-ap-southeast-2';

const ntsmBucket: Record<StageName, string> = {
  BETA: `ntsm-fingerprints-${BETA_ENVIRONMENT.account}-ap-southeast-2`,
  GAMMA: `ntsm-fingerprints-${GAMMA_ENVIRONMENT.account}-ap-southeast-2`,
  PROD: `ntsm-fingerprints-${PROD_ENVIRONMENT.account}-ap-southeast-2`,
};

/*
Data sharing - need this in constants since the bucket will be read by the filemanager
*/
const dataSharingCacheBucket: Record<StageName, string> = {
  BETA: `data-sharing-artifacts-${BETA_ENVIRONMENT.account}-ap-southeast-2`,
  GAMMA: `data-sharing-artifacts-${GAMMA_ENVIRONMENT.account}-ap-southeast-2`,
  PROD: `data-sharing-artifacts-${PROD_ENVIRONMENT.account}-ap-southeast-2`,
};

// DLQs for stateless stack functions
const eventDlqNameFMAnnotator = 'orcabus-event-dlq-fmannotator';

/*
 External Projects
*/
const externalProjectBuckets: Record<StageName, string[]> = {
  BETA: [],
  GAMMA: [],
  PROD: [
    // Project Montauk
    'pipeline-montauk-977251586657-ap-southeast-2',
  ],
};

/**
 * Configuration for resources created in SharedStack
 */
// Db Construct
const dbClusterIdentifier = 'orcabus-db';
const dbClusterResourceIdParameterName = '/orcabus/db-cluster-resource-id';
const dbClusterEndpointHostParameterName = '/orcabus/db-cluster-endpoint-host';
const databasePort = 5432;
const rdsMasterSecretName = 'orcabus/master-rds'; // pragma: allowlist secret

const getEventSchemaRegistryConstructProps = (): SchemaRegistryProps => {
  return {
    registryName: eventSchemaRegistryName,
    description: 'Schema Registry for ' + eventSchemaRegistryName,
  };
};

const getDataSchemaRegistryConstructProps = (): SchemaRegistryProps => {
  return {
    registryName: dataSchemaRegistryName,
    description: 'Schema Registry for ' + dataSchemaRegistryName,
  };
};

const getEventBusConstructProps = (stage: StageName): EventBusProps => {
  const baseConfig = {
    eventBusName: eventBusName,
    archiveName: 'OrcaBusMainArchive',
    archiveDescription: 'OrcaBus main event bus archive',
    archiveRetention: 365,
  };

  const baseUniversalEventArchiverProps = {
    vpcProps: vpcProps,
    lambdaSecurityGroupName: 'OrcaBusSharedEventBusUniversalEventArchiveSecurityGroup',
    bucketRemovalPolicy: RemovalPolicy.DESTROY,
  };

  switch (stage) {
    case 'BETA':
      return {
        ...baseConfig,
        addCustomEventArchiver: true,
        universalEventArchiverProps: {
          ...baseUniversalEventArchiverProps,
          archiveBucketName: 'orcabus-universal-events-archive-' + BETA_ENVIRONMENT.account,
        },
      };
    case 'GAMMA':
      return {
        ...baseConfig,
        addCustomEventArchiver: true,
        universalEventArchiverProps: {
          ...baseUniversalEventArchiverProps,
          archiveBucketName: 'orcabus-universal-events-archive-' + GAMMA_ENVIRONMENT.account,
        },
      };
    case 'PROD':
      return {
        ...baseConfig,
        addCustomEventArchiver: true,
        universalEventArchiverProps: {
          ...baseUniversalEventArchiverProps,
          archiveBucketName: 'orcabus-universal-events-archive-' + PROD_ENVIRONMENT.account,
          bucketRemovalPolicy: RemovalPolicy.RETAIN,
        },
      };
  }
};

const getComputeConstructProps = (): ComputeProps => {
  return {
    securityGroupName: SHARED_SECURITY_GROUP_NAME,
  };
};

export const eventSourcePattern = () => {
  return {
    $or: [
      {
        size: [{ numeric: ['>', 0] }],
      },
      {
        key: [{ 'anything-but': { wildcard: ['*/'] } }],
      },
    ],
  };
};

export const eventSourcePatternCache = () => {
  // NOT KEY in cache AND (SIZE > 0 OR NOT KEY ends with "/") expands to
  // (NOT KEY in cache and SIZE > 0) OR (NOT KEY in cache and NOT KEY ends with "/")\
  return {
    $or: [
      {
        key: [{ 'anything-but': { wildcard: ['byob-icav2/*/cache/*'] } }],
        size: [{ numeric: ['>', 0] }],
      },
      {
        key: [{ 'anything-but': { wildcard: ['byob-icav2/*/cache/*', '*/'] } }],
      },
    ],
  };
};

export const getEventSourceConstructProps = (stage: StageName): EventSourceProps => {
  const eventTypes = [
    'Object Created',
    'Object Deleted',
    'Object Restore Completed',
    'Object Restore Expired',
    'Object Storage Class Changed',
    'Object Access Tier Changed',
  ];

  const props = {
    queueName: eventSourceQueueName,
    maxReceiveCount: 3,
    rules: [
      {
        bucket: oncoanalyserBucket[stage],
        eventTypes,
        patterns: eventSourcePattern(),
      },
      {
        bucket: icav2PipelineCacheBucket[stage],
        eventTypes,
        patterns: eventSourcePatternCache(),
      },
    ],
  };

  if (stage === 'PROD') {
    props.rules.push({
      bucket: PROD_ICAV2_ARCHIVE_ANALYSIS_BUCKET,
      eventTypes,
      patterns: eventSourcePattern(),
    });
    props.rules.push({
      bucket: PROD_ICAV2_ARCHIVE_FASTQ_BUCKET,
      eventTypes,
      patterns: eventSourcePattern(),
    });
  }

  // Add the ntsm bucket rule
  props.rules.push({
    bucket: ntsmBucket[stage],
    eventTypes,
    patterns: eventSourcePattern(),
  });

  props.rules.push({
    bucket: dataSharingCacheBucket[stage],
    eventTypes,
    patterns: eventSourcePattern(),
  });

  for (const bucket of externalProjectBuckets[stage]) {
    props.rules.push({
      bucket: bucket,
      eventTypes,
      patterns: eventSourcePattern(),
    });
  }

  return props;
};

const getEventDLQConstructProps = (): EventDLQProps[] => {
  return [
    {
      queueName: eventDlqNameFMAnnotator,
      alarmName: 'Orcabus FMAnnotator DLQ Alarm',
    },
  ];
};

const getDatabaseConstructProps = (stage: StageName): ConfigurableDatabaseProps => {
  const baseConfig = {
    clusterIdentifier: dbClusterIdentifier,
    defaultDatabaseName: 'orcabus',
    version: AuroraPostgresEngineVersion.VER_16_6,
    parameterGroupName: 'default.aurora-postgresql16',
    username: 'postgres',
    dbPort: databasePort,
    masterSecretName: rdsMasterSecretName,
    clusterResourceIdParameterName: dbClusterResourceIdParameterName,
    clusterEndpointHostParameterName: dbClusterEndpointHostParameterName,
    secretRotationSchedule: Duration.days(7),
  };

  switch (stage) {
    case 'BETA':
      return {
        ...baseConfig,
        numberOfInstance: 1,
        minACU: 0.5,
        maxACU: 16,
        enhancedMonitoringInterval: Duration.seconds(60),
        enablePerformanceInsights: true,
        removalPolicy: RemovalPolicy.DESTROY,
        backupRetention: Duration.days(1),
        createT2BackupRetention: false,
      };
    case 'GAMMA':
      return {
        ...baseConfig,
        numberOfInstance: 1,
        minACU: 0.5,
        maxACU: 16,
        enhancedMonitoringInterval: Duration.seconds(60),
        enablePerformanceInsights: true,
        removalPolicy: RemovalPolicy.DESTROY,
        backupRetention: Duration.days(1),
        createT2BackupRetention: false,
      };
    case 'PROD':
      return {
        ...baseConfig,
        numberOfInstance: 1,
        minACU: 0.5,
        maxACU: 16,
        enhancedMonitoringInterval: Duration.seconds(60),
        enablePerformanceInsights: true,
        removalPolicy: RemovalPolicy.RETAIN,
        backupRetention: Duration.days(7),
        createT2BackupRetention: true,
      };
  }
};

export const getSharedStackProps = (stage: StageName): SharedStackProps => {
  return {
    vpcProps,
    eventSchemaRegistryProps: getEventSchemaRegistryConstructProps(),
    dataSchemaRegistryProps: getDataSchemaRegistryConstructProps(),
    eventBusProps: getEventBusConstructProps(stage),
    databaseProps: getDatabaseConstructProps(stage),
    computeProps: getComputeConstructProps(),
    eventSourceProps: getEventSourceConstructProps(stage),
    eventDLQProps: getEventDLQConstructProps(),
  };
};
