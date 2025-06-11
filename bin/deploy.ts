#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StatefulStack } from '../infrastructure/shared-stack/toolchain/shared-stack';
import { TOOLCHAIN_ENVIRONMENT } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';
import { ToolchainBootstrapStack } from '../infrastructure/bootstrap-stack/bootstrap-stack';
import { AuthorizationManagerPipelineStack } from '../infrastructure/authorization-manager/toolchain/pipeline';
import { TokenServicePipelineStack } from '../infrastructure/token-service/toolchain/stack';
import { PostgresManagerPipelineStack } from '../infrastructure/postgres-manager/toolchain/pipeline';

const app = new cdk.App();

const deployMode = app.node.tryGetContext('deployMode');
if (!deployMode) {
  throw new Error("deployMode is required in context (e.g. '-c deployMode=stateless')");
}

if (deployMode === 'sharedStack') {
  new StatefulStack(app, 'OrcaBusStatefulSharedStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else if (deployMode === 'toolchainBootstrap') {
  new ToolchainBootstrapStack(app, 'OrcaBusToolchainBootstrapStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else if (deployMode === 'authorizationManager') {
  new AuthorizationManagerPipelineStack(app, 'OrcaBusAuthorizationStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else if (deployMode === 'tokenService') {
  new TokenServicePipelineStack(app, 'OrcaBusTokenServiceStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else if (deployMode === 'postgresManager') {
  new PostgresManagerPipelineStack(app, 'OrcaBusPostgresManagerStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else {
  throw new Error("Invalid 'deployMode' set in the context");
}
