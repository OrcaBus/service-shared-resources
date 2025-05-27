# Template Service

## Overview

The root of the project is an AWS CDK project where the main application logic lives inside the `./app` folder.

## Project Structure

The project is organized into the following key directories:



- **`./bin/deploy.ts`**: Serves as the entry point of the application. It initializes two root stacks: `stateless` and `stateful`. You can remove one of these if your service does not require it.

- **`./infrastructure`**: Contains the infrastructure code for the project:
- **`./infrastructure/toolchain`**: Contains stacks for resources deployed in the toolchain account, including:
  - **Stateless and stateful stacks** for setting up CodePipeline and related resources for cross-environment deployments.
    - **Bootstrap stack** for one-time setup tasks required by the toolchain account (e.g., artifact buckets, roles).
  - **`./infrastructure/stage`**: Defines the stage stacks for different environments:
    - **`./infrastructure/stage/config.ts`**: Contains environment-specific configuration files (e.g., `beta`, `gamma`, `prod`).
    - **`./infrastructure/stage/stack.ts`**: The CDK stack entry point for provisioning resources required for the
      shared resource in its respective account.

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

This template provides two types of CDK entry points:

- **`cdk-toolchain-bootstrap`**: Used to deploy the bootstrap stack containing foundational, one-time setup resources required by the toolchain account (e.g., artifact buckets, IAM roles). This should be run only once per toolchain account, typically before deploying any other stacks.
- **`cdk-stateful`**: Used to deploy stacks containing stateful resources (e.g., AWS DynamoDB, AWS RDS), where redeployment may not be ideal due to potential side effects.

The type of stack to deploy is determined by the context set in the `./bin/deploy.ts` file. This ensures the correct stack is executed based on the provided context.

For example:

```sh
pnpm cdk-toolchain-bootstrap <command>

pnpm cdk-stateful <command>
```

### Stacks

Currently, this CDK project provides a single stack: `OrcaBusToolchainBootstrapStack`.
This stack bootstraps the toolchain account with foundational resources (such as artifact buckets) required before deploying any other OrcaBus resources.

To list available stacks, run:

```sh
pnpm cdk-toolchain-bootstrap ls
```

Example output:

```sh
OrcaBusToolchainBootstrapStack
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
