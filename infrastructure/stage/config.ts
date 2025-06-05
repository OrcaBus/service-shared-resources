import { AuroraPostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { SchemaRegistryProps } from './constructs/schema-registry';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { SharedStackProps } from './stack';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
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
import {
  SHARED_SECURITY_GROUP_NAME,
  VPC_LOOKUP_PROPS,
} from '@orcabus/platform-cdk-constructs/shared-config/networking';
import {
  DATA_SCHEMA_REGISTRY_NAME,
  EVENT_BUS_NAME,
  EVENT_SCHEMA_REGISTRY_NAME,
} from '@orcabus/platform-cdk-constructs/shared-config/event-bridge';
import {
  DATABASE_PORT,
  DB_CLUSTER_ENDPOINT_HOST_PARAMETER_NAME,
  DB_CLUSTER_IDENTIFIER,
  DB_CLUSTER_RESOURCE_ID_PARAMETER_NAME,
  RDS_MASTER_SECRET_NAME,
} from '@orcabus/platform-cdk-constructs/shared-config/database';

/* ******
 * TODO: Remove this to file manager
 * *****/

const eventSourceQueueName = 'orcabus-event-source-queue';
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

const getEventSchemaRegistryConstructProps = (): SchemaRegistryProps => {
  return {
    registryName: EVENT_SCHEMA_REGISTRY_NAME,
    description: 'Schema Registry for ' + EVENT_SCHEMA_REGISTRY_NAME,
  };
};

const getDataSchemaRegistryConstructProps = (): SchemaRegistryProps => {
  return {
    registryName: DATA_SCHEMA_REGISTRY_NAME,
    description: 'Schema Registry for ' + DATA_SCHEMA_REGISTRY_NAME,
  };
};

const getEventBusConstructProps = (stage: StageName): EventBusProps => {
  const baseConfig = {
    eventBusName: EVENT_BUS_NAME,
    archiveName: 'OrcaBusMainArchive',
    archiveDescription: 'OrcaBus main event bus archive',
    archiveRetention: 365,
  };

  const baseUniversalEventArchiverProps = {
    vpcProps: VPC_LOOKUP_PROPS,
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

const getComputeConstructProps = (stage: StageName): ComputeProps => {
  // CDK by default generates a description for the security group which contain the construct Id
  // Since this is deployed in old repo and SG can't be modified (must be replaced),
  // we need to set a static description following old repo's convention
  switch (stage) {
    case 'BETA':
      return {
        securityGroupName: SHARED_SECURITY_GROUP_NAME,
        securityGroupDescription:
          'OrcaBusStatefulPipeline/OrcaBusBeta/SharedStack/ComputeConstruct/SecurityGroup',
      };
    case 'GAMMA':
      return {
        securityGroupName: SHARED_SECURITY_GROUP_NAME,
        securityGroupDescription:
          'OrcaBusStatefulPipeline/OrcaBusGamma/SharedStack/ComputeConstruct/SecurityGroup',
      };
    case 'PROD':
      return {
        securityGroupName: SHARED_SECURITY_GROUP_NAME,
        securityGroupDescription:
          'OrcaBusStatefulPipeline/OrcaBusProd/SharedStack/ComputeConstruct/SecurityGroup',
      };
  }
};

const eventSourcePattern = () => {
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

const eventSourcePatternCache = () => {
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

const getEventSourceConstructProps = (stage: StageName): EventSourceProps => {
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
    clusterIdentifier: DB_CLUSTER_IDENTIFIER,
    defaultDatabaseName: 'orcabus',
    version: AuroraPostgresEngineVersion.VER_16_6,
    parameterGroupName: 'default.aurora-postgresql16',
    username: 'postgres',
    dbPort: DATABASE_PORT,
    masterSecretName: RDS_MASTER_SECRET_NAME,
    clusterResourceIdParameterName: DB_CLUSTER_RESOURCE_ID_PARAMETER_NAME,
    clusterEndpointHostParameterName: DB_CLUSTER_ENDPOINT_HOST_PARAMETER_NAME,
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
    vpcProps: VPC_LOOKUP_PROPS,
    eventSchemaRegistryProps: getEventSchemaRegistryConstructProps(),
    dataSchemaRegistryProps: getDataSchemaRegistryConstructProps(),
    eventBusProps: getEventBusConstructProps(stage),
    databaseProps: getDatabaseConstructProps(stage),
    computeProps: getComputeConstructProps(stage),
    eventSourceProps: getEventSourceConstructProps(stage),
    // On removal also remove the path suppression in ./test/stage.test.ts
    eventDLQProps: getEventDLQConstructProps(),
  };
};
