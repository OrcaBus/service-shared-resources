import { DeploymentStackPipeline } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PostgresManagerStack } from '../stage/deploy/stack';
import { getPostgresManagerStackProps } from '../stage/deploy/config';

export class PostgresManagerPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new DeploymentStackPipeline(this, 'Pipeline', {
      githubBranch: 'main',
      githubRepo: 'service-shared-resources',
      stack: PostgresManagerStack,
      stackName: 'PostgresManagerStack',
      stackConfig: {
        beta: getPostgresManagerStackProps(),
        gamma: getPostgresManagerStackProps(),
        prod: getPostgresManagerStackProps(),
      },
      pipelineName: 'OrcaBus-PostgresManager',
      cdkSynthCmd: [
        'pnpm install --frozen-lockfile --ignore-scripts',
        'pnpm cdk-postgres-manager synth',
      ],
      includedFilePaths: ['infrastructure/postgres-manager/**'],
    });
  }
}
