# Template Service

## Overview

This repository is designed to deploy resources that can be reused or shared by different microservices across all AWS
accounts (beta, gamma, prod, and toolchain).


## Project Structure

The project is organized into the following key directories:

- **`./bin/deploy.ts`**: Serves as the entry point of the application.
- **`./infrastructure`**: Contains the infrastructure code for the project.
  Each subfolder within `infrastructure` now represents a different app (for example: `authorization-manager/`, `token-service/`, `postgres-manager/`, etc.).
- **`.github/workflows/pr-tests.yml`**: Configures GitHub Actions to run tests for `make check` (linting and code style), tests defined in `./test`, and `make test` for the `./app` directory. Modify this file as needed to ensure the tests are properly configured for your environment.

- **`./test`**: Contains tests for CDK code compliance against `cdk-nag`. You should modify these test files to match the resources defined in the `./infrastructure` folder.

## Setup

### Requirements

```sh
node --version
v22.9.0

# Update Corepack (if necessary, as per pnpm documentation)
npm install --global corepack@latest

# Enable Corepack to use pnpm
corepack enable pnpm

```

### Install Dependencies

To install all required dependencies, run:

```sh
make install
```

### First Steps

Before using this template, search for all instances of `TODO:` comments in the codebase and update them as appropriate for your service. This includes replacing placeholder values (such as stack names).

### CDK Commands

You can access CDK commands using the `pnpm` wrapper script.

This template provides several CDK entry points, each mapped to a specific stack or deployment mode:

```json
"cdk-shared-stack": "cdk -c deployMode=sharedStack",
"cdk-toolchain-bootstrap": "cdk -c deployMode=toolchainBootstrap",
"cdk-authorization-manager": "cdk -c deployMode=authorizationManager",
"cdk-token-service": "cdk -c deployMode=tokenService",
"cdk-postgres-manager": "cdk -c deployMode=postgresManager",
```

- **`cdk-shared-stack`**: Deploys the shared stateful stack for resources used across microservices.
- **`cdk-toolchain-bootstrap`**: Deploys the bootstrap stack with foundational, one-time setup resources required by the
  toolchain account (e.g., artifact buckets, KMS keys). This should be run only once per toolchain account, typically
  before deploying any other stacks. _Note: This stack is currently deployed manually whenever changes are made to it._
- **`cdk-authorization-manager`**: Deploys the authorization manager pipeline stack.
- **`cdk-token-service`**: Deploys the token service pipeline stack.
- **`cdk-postgres-manager`**: Deploys the Postgres manager pipeline stack.

The type of stack to deploy is determined by the context set in the `./bin/deploy.ts` file. This ensures the correct stack is executed based on the provided context.

#### Usage Example

```sh
pnpm cdk-toolchain-bootstrap <command>
pnpm cdk-shared-stack <command>
pnpm cdk-authorization-manager <command>
pnpm cdk-token-service <command>
pnpm cdk-postgres-manager <command>
```

## Linting and Formatting

### Run Checks

To run linting and formatting checks on the root project, use:

```sh
make check
```

### Fix Issues

To automatically fix issues with ESLint and Prettier, run:

```sh
make fix
```
