import {
  SHARED_SECURITY_GROUP_NAME,
  VPC_LOOKUP_PROPS,
} from '@orcabus/platform-cdk-constructs/shared-config/networking';
import { Duration } from 'aws-cdk-lib';
import { PostgresManagerStackProps } from './stack';
import {
  DATABASE_PORT,
  DB_CLUSTER_IDENTIFIER,
  DB_CLUSTER_RESOURCE_ID_PARAMETER_NAME,
  RDS_MASTER_SECRET_NAME,
} from '@orcabus/platform-cdk-constructs/shared-config/database';
import { DbAuthType } from '../function/type';

export const getPostgresManagerStackProps = (): PostgresManagerStackProps => {
  return {
    vpcProps: VPC_LOOKUP_PROPS,
    lambdaSecurityGroupName: SHARED_SECURITY_GROUP_NAME,
    masterSecretName: RDS_MASTER_SECRET_NAME,
    dbClusterIdentifier: DB_CLUSTER_IDENTIFIER,
    clusterResourceIdParameterName: DB_CLUSTER_RESOURCE_ID_PARAMETER_NAME,
    dbPort: DATABASE_PORT,
    microserviceDbConfig: [
      {
        name: 'sequence_run_manager',
        authType: DbAuthType.RDS_IAM,
      },
      {
        name: 'workflow_manager',
        authType: DbAuthType.RDS_IAM,
      },
      {
        name: 'metadata_manager',
        authType: DbAuthType.RDS_IAM,
      },
      { name: 'filemanager', authType: DbAuthType.RDS_IAM },
    ],
    secretRotationSchedule: Duration.days(7),
  };
};
