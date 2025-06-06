import path from 'path';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { aws_lambda, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { IVpc, ISecurityGroup } from 'aws-cdk-lib/aws-ec2';

export interface UniversalEventArchiverConstructProps {
  vpc: IVpc;
  lambdaSG: ISecurityGroup;
  archiveBucket: IBucket;
  eventBus: IEventBus;
}

export class UniversalEventArchiverConstruct extends Construct {
  private readonly id: string;
  private readonly lambdaRuntimePythonVersion: aws_lambda.Runtime = aws_lambda.Runtime.PYTHON_3_12;

  constructor(scope: Construct, id: string, props: UniversalEventArchiverConstructProps) {
    super(scope, id);

    this.id = id;

    const eventBus = props.eventBus;
    const archiveBucket = props.archiveBucket;
    const lambdaSG = props.lambdaSG;

    const archiveEventFunction = new PythonFunction(this, 'UniversalEventArchiver', {
      entry: path.join(__dirname, '../../archive_service'),
      runtime: this.lambdaRuntimePythonVersion,
      environment: {
        BUCKET_NAME: archiveBucket.bucketName,
      },
      vpc: props.vpc,
      vpcSubnets: { subnets: props.vpc.privateSubnets },
      securityGroups: [lambdaSG],
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(28),
      index: 'universal_event_archiver.py',
      handler: 'handler',
    });

    archiveBucket.grantPut(archiveEventFunction);

    // We should not do "this.id + 'EventRule'" as the construct Id
    // But changing this will need to replace the rule and it will cause name clash issue
    const rule = new Rule(this, this.id + 'EventRule', {
      ruleName: 'UniversalEventArchiverRule',
      description: 'Rule to archive all events to S3',
      eventBus,
      eventPattern: {
        account: [Stack.of(this).account],
      },
    });

    rule.addTarget(
      new LambdaFunction(archiveEventFunction, {
        maxEventAge: Duration.seconds(60), // Maximum age must have value greater than or equal to 60 (Service: EventBridge)
        retryAttempts: 3, // Retry up to 3 times
      })
    );

    // Optional: If the Lambda function needs more permissions
    archiveEventFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [archiveBucket.bucketArn + '/*'],
      })
    );
  }
}
