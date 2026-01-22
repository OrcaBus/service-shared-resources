import { DeploymentStackPipeline } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SharedStack } from '../stage/stack';
import { getSharedStackProps } from '../stage/config';

export class StatefulStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new DeploymentStackPipeline(this, 'DeploymentPipeline', {
      githubBranch: 'main',
      githubRepo: 'service-shared-resources',
      stack: SharedStack,
      stackName: 'SharedStack',
      stackConfig: {
        beta: getSharedStackProps('BETA'),
        gamma: getSharedStackProps('GAMMA'),
        prod: getSharedStackProps('PROD'),
      },
      pipelineName: 'OrcaBus-StatefulSharedResources',
      cdkSynthCmd: [
        'pnpm install --frozen-lockfile --ignore-scripts',
        'pnpm cdk-shared-stack synth',
      ],
      includedFilePaths: ['infrastructure/shared-stack/**'],
      unitAppTestConfig: {
        // only event bus archiver has app tests.
        command: [
          'cd infrastructure/shared-stack/stage/constructs/event-bus/custom-event-archiver',
          'make install',
          'make test',
        ],
      },
      unitIacTestConfig: {
        command: ['pnpm test shared-stack.test.ts'],
      },
    });
  }
}
