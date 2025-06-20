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
  };
};
