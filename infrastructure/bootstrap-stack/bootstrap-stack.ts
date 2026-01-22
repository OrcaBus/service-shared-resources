import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CrossDeploymentArtifactBucket } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import { CodeBuildCacheBucket } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline/cache-bucket';

export class ToolchainBootstrapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new CrossDeploymentArtifactBucket(this, 'CrossDeploymentArtifactBucket');
    new CodeBuildCacheBucket(this, 'CodeBuildCacheBucket');
  }
}
