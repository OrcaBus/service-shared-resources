import { App, Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { SynthesisMessage } from 'aws-cdk-lib/cx-api';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { AuthorizationManagerStack } from '../infrastructure/authorization-manager/stage/stack';
import { getAuthorizationManagerStackProps } from '../infrastructure/authorization-manager/stage/config';
import cedarSchemaJson from '../infrastructure/authorization-manager/stage/cedarSchema.json';

function synthesisMessageToString(sm: SynthesisMessage): string {
  return `${sm.entry.data} [${sm.id}]`;
}

describe('cdk-nag-authorization-stack', () => {
  const app = new App({});

  // You should configure all stack (sateless, stateful) to be tested
  const deployStack = new AuthorizationManagerStack(app, 'AuthorizationManagerStack', {
    ...getAuthorizationManagerStackProps('PROD'),
    env: {
      account: '123456789',
      region: 'ap-southeast-2',
    },
  });

  Aspects.of(deployStack).add(new AwsSolutionsChecks());
  applyNagSuppression(deployStack);

  test(`cdk-nag AwsSolutions Pack errors`, () => {
    const errors = Annotations.fromStack(deployStack)
      .findError('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(errors).toHaveLength(0);
  });

  test(`cdk-nag AwsSolutions Pack warnings`, () => {
    const warnings = Annotations.fromStack(deployStack)
      .findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(warnings).toHaveLength(0);
  });
});

describe('workflow state transition authorization', () => {
  const app = new App({});
  const stack = new AuthorizationManagerStack(app, 'WorkflowAuthorizationTestStack', {
    ...getAuthorizationManagerStackProps('PROD'),
    env: {
      account: '123456789',
      region: 'ap-southeast-2',
    },
  });
  const template = Template.fromStack(stack);
  const policies = Object.values(
    template.findResources('AWS::VerifiedPermissions::Policy')
  ) as Record<string, unknown>[];

  const serializedPolicy = (description: string): string => {
    const matchingPolicies = policies.filter((policy) =>
      JSON.stringify(policy).includes(`"Description":"${description}"`)
    );

    expect(matchingPolicies).toHaveLength(1);
    return JSON.stringify(matchingPolicies[0]);
  };

  test('registers only protected workflow state transition actions in the strict Cedar schema', () => {
    const actions = cedarSchemaJson.OrcaBus.actions;

    expect(actions).toHaveProperty('POST /api/v1/workflowrun/state/deprecate');
    expect(actions).toHaveProperty('POST /api/v1/workflowrun/state/resolve');
    expect(actions).not.toHaveProperty('POST /api/v1/workflowrun/state/cancel');
  });

  test('grants deprecation only to curators among non-admin groups', () => {
    const policy = serializedPolicy(
      'Permissions to mark a workflowrun as deprecated in WORKFLOW microservice'
    );

    expect(policy).toContain('|curators');
    expect(policy).toContain('POST /api/v1/workflowrun/state/deprecate');
    expect(policy).toContain('OrcaBus::Microservice::\\"WORKFLOW\\"');
  });

  test('keeps resolution admin-only through the admin wildcard policy', () => {
    const adminPolicy = serializedPolicy('Allow all actions on all resources');
    const nonAdminPolicies = policies.filter(
      (policy) => !JSON.stringify(policy).includes('Allow all actions on all resources')
    );

    expect(adminPolicy).toContain('|admin');
    expect(adminPolicy).toContain('action,\\n              resource');
    expect(JSON.stringify(nonAdminPolicies)).not.toContain(
      'POST /api/v1/workflowrun/state/resolve'
    );
  });
});

/**
 * apply nag suppression
 * @param stack
 */
function applyNagSuppression(stack: Stack) {
  NagSuppressions.addStackSuppressions(
    stack,
    [{ id: 'AwsSolutions-IAM4', reason: 'Allow AWS managed policies' }],
    true
  );
  NagSuppressions.addStackSuppressions(
    stack,
    [{ id: 'AwsSolutions-IAM5', reason: 'Allow wildcard permissions' }],
    true
  );
  NagSuppressions.addStackSuppressions(
    stack,
    [
      {
        id: 'AwsSolutions-L1',
        reason: 'Allow to use non latest runtime version for Lambda functions.',
      },
    ],
    true
  );
}
