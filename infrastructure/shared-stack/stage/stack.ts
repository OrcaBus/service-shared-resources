import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, VpcLookupOptions } from 'aws-cdk-lib/aws-ec2';
import { EventBusConstruct, EventBusProps } from './constructs/event-bus';
import { ConfigurableDatabaseProps, DatabaseConstruct } from './constructs/database';
import { ComputeProps, ComputeConstruct } from './constructs/compute';
import { SchemaRegistryConstruct, SchemaRegistryProps } from './constructs/schema-registry';

export interface SharedStackProps {
  /**
   * Any configuration related to the SchemaRegistryConstruct
   */
  eventSchemaRegistryProps: SchemaRegistryProps;
  dataSchemaRegistryProps: SchemaRegistryProps;
  /**
   * Any configuration related to the EventBusConstruct
   */
  eventBusProps: EventBusProps;
  /**
   * Any configuration related to database
   */
  databaseProps: ConfigurableDatabaseProps;
  /**
   * Any configuration related to shared compute resources
   */
  computeProps: ComputeProps;
  /**
   * VPC (lookup props) that will be used by resources
   */
  vpcProps: VpcLookupOptions;
}

export class SharedStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & SharedStackProps) {
    super(scope, id, props);

    const mainVpc = Vpc.fromLookup(this, 'MainVpc', props.vpcProps);

    const computeResources = new ComputeConstruct(
      this,
      'ComputeConstruct',
      mainVpc,
      props.computeProps
    );

    new EventBusConstruct(this, 'EventBusConstruct', props.eventBusProps);

    new DatabaseConstruct(this, 'DatabaseConstruct', {
      vpc: mainVpc,
      allowedInboundSG: computeResources.securityGroup,
      ...props.databaseProps,
    });

    new SchemaRegistryConstruct(
      this,
      'EventSchemaRegistryConstruct',
      props.eventSchemaRegistryProps
    );
    new SchemaRegistryConstruct(this, 'DataSchemaRegistryConstruct', props.dataSchemaRegistryProps);
  }
}
