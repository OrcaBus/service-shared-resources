import { Construct } from 'constructs';

import { DatabaseCluster, DatabaseSecret } from 'aws-cdk-lib/aws-rds';
import { ISecret, SecretRotation, SecretRotationApplication } from 'aws-cdk-lib/aws-secretsmanager';
import { Duration } from 'aws-cdk-lib';
import { IVpc, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';

export type ReadOnlyUserSecretProps = {
  /**
   * The database cluster to rotate the secret for.
   */
  dbCluster: DatabaseCluster;
  /**
   * The schedule (in Duration) that will rotate the master secret
   */
  vpc: IVpc;
  /**
   * The schedule (in Duration) that will rotate the master secret
   */
  secretRotationSchedule: Duration;
  /**
   * The security group to use for the rotation.
   */
  securityGroup: SecurityGroup;
  /**
   * The master secret to use for the rotation.
   */
  masterSecret: ISecret;
};

export class ReadOnlyUserSecret extends Construct {
  readonly databaseSecret: DatabaseSecret;

  constructor(scope: Construct, id: string, props: ReadOnlyUserSecretProps) {
    super(scope, id);

    this.databaseSecret = new DatabaseSecret(this, 'ReadOnlyDbSecret', {
      username: 'orcabus_ro',
      secretName: 'orcabus/ro-user', // pragma: allowlist secret
    });

    new SecretRotation(this, 'ReadOnlyDbSecretRotation', {
      application: SecretRotationApplication.POSTGRES_ROTATION_SINGLE_USER,
      // From default: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseSecret.html#excludecharacters
      excludeCharacters: '" %+~`#$&()|[]{}:;' + `<>?!'/@"\\")*`,
      secret: this.databaseSecret,
      target: props.dbCluster,
      automaticallyAfter: props.secretRotationSchedule,
      masterSecret: props.masterSecret,
      securityGroup: props.securityGroup,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
  }
}
