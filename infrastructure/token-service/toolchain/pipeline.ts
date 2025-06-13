import { DeploymentStackPipeline } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TokenServiceStack } from '../stage/deploy/stack';
import { getTokenServiceStackProps } from '../stage/config';

export class TokenServicePipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new DeploymentStackPipeline(this, 'Pipeline', {
      githubBranch: 'main',
      githubRepo: 'service-shared-resources',
      stack: TokenServiceStack,
      stackName: 'TokenServiceStack',
      stackConfig: {
        beta: getTokenServiceStackProps(),
        gamma: getTokenServiceStackProps(),
        prod: getTokenServiceStackProps(),
      },
      pipelineName: 'OrcaBus-Authorization-Manager-Stack',
      cdkSynthCmd: [
        'pnpm install --frozen-lockfile --ignore-scripts',
        'pnpm cdk-token-service synth',
      ],
      includedFilePaths: ['infrastructure/token-service/**'],
    });
  }
}
