import { VPC_LOOKUP_PROPS } from '@orcabus/platform-cdk-constructs/shared-config/networking';
import { TokenServiceStackProps } from './deploy/stack';
import { DEFAULT_COGNITO_USER_POOL_ID_PARAMETER_NAME } from '@orcabus/platform-cdk-constructs/api-gateway';

export const getTokenServiceStackProps = (): TokenServiceStackProps => {
  return {
    serviceUserSecretName: 'orcabus/token-service-user', // pragma: allowlist secret
    jwtSecretName: 'orcabus/token-service-jwt', // pragma: allowlist secret
    vpcProps: VPC_LOOKUP_PROPS,
    cognitoUserPoolIdParameterName: DEFAULT_COGNITO_USER_POOL_ID_PARAMETER_NAME,
    cognitoPortalAppClientIdParameterName: '/data_portal/client/data2/cog_app_client_id_stage',
  };
};
