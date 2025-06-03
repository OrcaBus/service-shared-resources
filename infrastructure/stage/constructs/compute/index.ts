import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface ComputeProps {
  /**
   * The security group name for the shared security group
   */
  securityGroupName: string;
}

/**
 * Any resources that could be shared among compute resources
 */
export class ComputeConstruct extends Construct {
  readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, vpc: ec2.IVpc, props: ComputeProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      securityGroupName: props.securityGroupName,
      vpc: vpc,
      allowAllOutbound: true,
      // June 2025 -  William
      // CDK by default generates a description for the security group which contain the construct Id
      // Since this is deployed in old repo and SG can't be modified (must be replaced),
      // we need to set a static description following old repo's convention
      description: 'OrcaBusStatefulPipeline/OrcaBusBeta/SharedStack/ComputeConstruct/SecurityGroup',
    });

    this.securityGroup.addIngressRule(
      this.securityGroup,
      ec2.Port.allTraffic(),
      'allow connection within the same SecurityGroup'
    );
  }
}
