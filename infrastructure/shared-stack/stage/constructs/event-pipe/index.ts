import { Construct } from 'constructs';
import { StackProps } from 'aws-cdk-lib';
import { IcaEventPipeConstruct, IcaEventPipeConstructProps } from './ica-event-pipe';

const alarmThreshod: number = 1;
const queueVizTimeout: number = 30;

/**
 * EventPipeProps
 */
export interface EventPipeProps {
  /** The name for stack */
  name: string;
  /** The name of the Event Bus to forward events to (used to lookup the Event Bus) */
  eventBusName: string;
  /** The name of the SNS Topic to receive DLQ notifications from CloudWatch */
  slackTopicName: string;
  /** The ICA account to grant publish permissions to */
  icaAwsAccountNumber: string;
}

export class EventPipeConstruct extends Construct {
  constructor(scope: Construct, id: string, props: StackProps & EventPipeProps) {
    super(scope, id);
    this.createConstruct(this, 'EventPipeConstruct', props);
  }

  private createConstruct(scope: Construct, id: string, props: StackProps & EventPipeProps) {
    const constructProps: IcaEventPipeConstructProps = {
      icaEventPipeName: props.name + 'Pipe',
      icaQueueName: props.name + 'Queue',
      icaQueueVizTimeout: queueVizTimeout,
      eventBusName: props.eventBusName,
      dlqMessageThreshold: alarmThreshod,
      slackTopicArn: this.constructTopicArn(props),
      icaAwsAccountNumber: props.icaAwsAccountNumber,
    };
    return new IcaEventPipeConstruct(scope, id, constructProps);
  }

  private constructTopicArn(props: StackProps & EventPipeProps) {
    if (!props.env) {
      throw new Error('No env properties found. Please ensure env.account and evn.region are set.');
    }
    if (!props.env.account) {
      throw new Error('No account');
    }
    if (!props.env.region) {
      throw new Error('No region');
    }
    return 'arn:aws:sns:' + props.env.region + ':' + props.env.account + ':' + props.slackTopicName;
  }
}
