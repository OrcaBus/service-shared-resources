import { App, Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { SynthesisMessage } from 'aws-cdk-lib/cx-api';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { SharedStack } from '../infrastructure/shared-stack/stage/shared-stack/stack';
import { getSharedStackProps } from '../infrastructure/shared-stack/stage/shared-stack/config';

function synthesisMessageToString(sm: SynthesisMessage): string {
  return `${sm.entry.data} [${sm.id}]`;
}

describe('cdk-nag-stateless-toolchain-stack', () => {
  const app = new App({});

  // You should configure all stack (sateless, stateful) to be tested
  const deployStack = new SharedStack(app, 'SharedStack', {
    ...getSharedStackProps('PROD'),
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
  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    ['/SharedStack/EventBusConstruct/UniversalEventArchiveBucket/Resource'],
    [
      {
        id: 'AwsSolutions-S1',
        reason: 'This is no necessity to retain the server access logs for Event Archiver Bucket.',
      },
    ],
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

  // Remove this when the resource is removed
  NagSuppressions.addResourceSuppressionsByPath(
    stack,
    '/SharedStack/OrcabusEventDlqFmannotator/Resource',
    [
      {
        id: 'AwsSolutions-SQS3',
        reason:
          'it is expected that the DLQ construct has a Queue without a DLQ, because that ' +
          'queue itself acts as the DLQ for other constructs.',
      },
    ],
    true
  );
}
