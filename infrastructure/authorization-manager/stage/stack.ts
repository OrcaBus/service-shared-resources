import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { CfnPolicyStore, CfnPolicy, CfnIdentitySource } from 'aws-cdk-lib/aws-verifiedpermissions';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

import cedarSchemaJson from './cedarSchema.json';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import path from 'path';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export interface AuthorizationManagerStackProps {
  cognito: CognitoConfig;
  authStackHttpLambdaAuthorizerParameterName: string;
}

/**
 * Describes a static Cedar policy that grants a Cognito user group access to a
 * set of actions on a microservice resource.
 *
 * NOTE: Please update README.md's permissions table if this list is modified.
 *
 * `id` is the CDK/CloudFormation logical id for the underlying CfnPolicy and
 * must stay stable across reordering/edits to avoid resource replacement.
 */
interface CedarGroupPolicy {
  id: string;
  /** One or more Cognito group names. Each group gets its own CfnPolicy. */
  groups: string[];
  description: string;
  actions?: string[];
  resource?: string;
}

const GROUP_POLICIES: CedarGroupPolicy[] = [
  {
    id: 'CognitoPortalAdminPolicy',
    groups: ['admin'],
    description: 'Allow all actions on all resources',
  },
  // WORKFLOW resource
  {
    id: 'CognitoWorkflowRerunPolicy',
    groups: ['curators', 'bioinfo'],
    description: 'Permissions to rerun workflowrun in WORKFLOW microservice',
    actions: ['POST /api/v1/workflowrun/{orcabusId}/rerun/{proxy+}'],
    resource: 'WORKFLOW',
  },
  {
    id: 'CognitoWorkflowDeprecatePolicy',
    groups: ['curators'],
    description: 'Permissions to mark a workflowrun as deprecated in WORKFLOW microservice',
    actions: ['POST /api/v1/workflowrun/state/deprecate'],
    resource: 'WORKFLOW',
  },
  // METADATA resource
  {
    id: 'CognitoBioinfoMetadataModifyPolicy',
    groups: ['bioinfo'],
    description: 'Permissions to trigger external sync in METADATA microservice',
    actions: ['POST /api/v1/sync/presigned-csv/{PROXY+}'],
    resource: 'METADATA',
  },
  // CASE resource
  {
    id: 'CognitoCaseEntityLinkModifyPolicy',
    groups: ['curators', 'bioinfo'],
    description: 'Permissions to manage case external entity links in CASE microservice',
    actions: [
      'POST /api/v1/case/{orcabusId}/external-entity/{PROXY+}',
      'DELETE /api/v1/case/{orcabusId}/external-entity/{externalEntityOrcabusId}/{PROXY+}',
    ],
    resource: 'CASE',
  },
];

interface CognitoConfig {
  /**
   * The SSM parameter name that cognito user pool ID is stored
   */
  userPoolIdParameterName: string;
  /**
   * The AWS region where the cognito user pool is deployed
   */
  region: string;
  /**
   * The AWS account number where the cognito user pool is deployed
   */
  accountNumber: string;
  /**
   * SSM parameter names holding the app client IDs allowed to mint tokens
   * that this policy store will accept. Restricts the identity source so
   * tokens from unrelated Cognito app clients under the same user pool
   * are not implicitly trusted.
   */
  clientIdParameterNames: string[];
}

export class AuthorizationManagerStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & AuthorizationManagerStackProps) {
    super(scope, id, props);

    // Grab the user pool ID from SSM
    const userPoolId = StringParameter.fromStringParameterName(
      this,
      'CognitoUserPoolIdStringParameter',
      props.cognito.userPoolIdParameterName
    ).stringValue;

    // Amazon Verified Permission
    const policyStore = new CfnPolicyStore(this, 'VerifiedPermissionPolicyStore', {
      validationSettings: { mode: 'STRICT' },
      description: 'OrcaBus authorization policy',
      schema: {
        cedarJson: JSON.stringify(cedarSchemaJson),
      },
    });

    this.setupCognitoIntegrationAndPolicy({
      userPoolId,
      cognito: props.cognito,
      policyStoreId: policyStore.attrPolicyStoreId,
    });

    this.setupTokenLambdaAuthorization({
      policyStoreARN: policyStore.attrArn,
      policyStoreId: policyStore.attrPolicyStoreId,
      authStackHttpLambdaAuthorizerParameterName: props.authStackHttpLambdaAuthorizerParameterName,
    });

    // Create policies for respective groups, defined in GROUP_POLICIES
    this.setupGroupPolicies({
      userPoolId,
      cfnPolicyStore: policyStore,
    });
  }

  /**
   * This sets up the Verified Permissions integration with Cognito.
   * It sources users from the Cognito user pool and creates a static policy
   * that grants all permissions to users in the admin group within the user pool.
   *
   * @param props Cognito properties
   */
  private setupCognitoIntegrationAndPolicy(props: {
    userPoolId: string;
    policyStoreId: string;
    cognito: CognitoConfig;
  }) {
    // Restrict accepted tokens to the platform's known app clients, rather than
    // implicitly trusting any app client registered under the user pool.
    const clientIds = props.cognito.clientIdParameterNames.map(
      (parameterName) =>
        StringParameter.fromStringParameterName(
          this,
          `CognitoAppClientIdStringParameter${parameterName}`,
          parameterName
        ).stringValue
    );

    // Allow the policy store to source the identity from existing Cognito User Pool Id
    new CfnIdentitySource(this, 'VerifiedPermissionIdentitySource', {
      configuration: {
        cognitoUserPoolConfiguration: {
          userPoolArn: `arn:aws:cognito-idp:${props.cognito.region}:${props.cognito.accountNumber}:userpool/${props.userPoolId}`,
          clientIds,
          groupConfiguration: {
            groupEntityType: 'OrcaBus::CognitoUserGroup', // Refer to './cedarSchema.json'
          },
        },
      },
      principalEntityType: 'OrcaBus::User',
      policyStoreId: props.policyStoreId,
    });
  }

  private setupTokenLambdaAuthorization(props: {
    policyStoreId: string;
    policyStoreARN: string;
    authStackHttpLambdaAuthorizerParameterName: string;
  }) {
    const lambdaAuth = new PythonFunction(this, 'HTTPLambdaAuthorizer', {
      entry: path.join(__dirname, 'http-lambda-authorizer'),
      architecture: Architecture.ARM_64,
      runtime: Runtime.PYTHON_3_12,
      index: 'http_authorizer.py',
      retryAttempts: 0,
      environment: { POLICY_STORE_ID: props.policyStoreId },
      initialPolicy: [
        new PolicyStatement({
          actions: ['verifiedpermissions:IsAuthorizedWithToken'],
          resources: [props.policyStoreARN],
        }),
      ],
    });

    new StringParameter(this, 'HTTPLambdaAuthorizerARNParameter', {
      parameterName: props.authStackHttpLambdaAuthorizerParameterName,
      description:
        'ARN of the HTTP lambda authorizer that allow access defined in Amazon Verified Permission',
      stringValue: lambdaAuth.functionArn,
    });
  }

  /**
   * Creates one CfnPolicy per entry in GROUP_POLICIES.
   *
   * NOTE: Please update README.md's permissions table if GROUP_POLICIES is modified.
   * @param userPoolId
   * @param cfnPolicyStore
   */
  private setupGroupPolicies({
    userPoolId,
    cfnPolicyStore,
  }: {
    userPoolId: string;
    cfnPolicyStore: CfnPolicyStore;
  }) {
    const policyStoreId = cfnPolicyStore.attrPolicyStoreId;

    for (const policyDef of GROUP_POLICIES) {
      for (const group of policyDef.groups) {
        // When multiple groups share a policy entry, suffix the CDK logical ID with the group
        // name to keep IDs unique and stable.
        const cfnId = `${policyDef.id}${group.charAt(0).toUpperCase()}${group.slice(1)}`;

        const principal = `OrcaBus::CognitoUserGroup::"${userPoolId}|${group}"`;
        const actionResourceClause = policyDef.actions
          ? `action in
                [${policyDef.actions.map((action) => `OrcaBus::Action::"${action}"`).join(', ')}],
              resource == OrcaBus::Microservice::"${policyDef.resource}"`
          : `action,
              resource`;

        const cfnPolicy = new CfnPolicy(this, cfnId, {
          definition: {
            static: {
              statement: `
            permit (
              principal in ${principal},
              ${actionResourceClause}
            );
          `,
              description: policyDef.description,
            },
          },
          policyStoreId: policyStoreId,
        });
        cfnPolicy.node.addDependency(cfnPolicyStore);
      }
    }
  }
}
