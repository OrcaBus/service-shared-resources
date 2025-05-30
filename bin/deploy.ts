#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StatefulStack } from '../infrastructure/toolchain/stateful-stack';
import { TOOLCHAIN_ENVIRONMENT } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import { ToolchainBootstrapStack } from '../infrastructure/toolchain/bootstrap-stack';

const app = new cdk.App();

const deployMode = app.node.tryGetContext('deployMode');
if (!deployMode) {
  throw new Error("deployMode is required in context (e.g. '-c deployMode=stateless')");
}

if (deployMode === 'stateful') {
  new StatefulStack(app, 'OrcaBusStatefulSharedStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else if (deployMode === 'toolchainBootstrap') {
  new ToolchainBootstrapStack(app, 'OrcaBusToolchainBootstrapStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else {
  throw new Error("Invalid 'deployMode` set in the context");
}
