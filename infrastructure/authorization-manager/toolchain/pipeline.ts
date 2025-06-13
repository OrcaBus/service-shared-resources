import { DeploymentStackPipeline } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AuthorizationManagerStack } from '../stage/stack';
import { getAuthorizationManagerStackProps } from '../stage/config';

export class AuthorizationManagerPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new DeploymentStackPipeline(this, 'Pipeline', {
      githubBranch: 'main',
      githubRepo: 'service-shared-resources',
      stack: AuthorizationManagerStack,
      stackName: 'AuthorizationManagerStack',
      stackConfig: {
        beta: getAuthorizationManagerStackProps('BETA'),
        gamma: getAuthorizationManagerStackProps('GAMMA'),
        prod: getAuthorizationManagerStackProps('PROD'),
      },
      pipelineName: 'OrcaBus-AuthorizationManager',
      cdkSynthCmd: [
        'pnpm install --frozen-lockfile --ignore-scripts',
        'pnpm cdk-authorization-manager synth',
      ],
      includedFilePaths: ['infrastructure/authorization-manager/**'],
    });
  }
}
