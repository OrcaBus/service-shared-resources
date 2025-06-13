import { VPC_LOOKUP_PROPS } from '@orcabus/platform-cdk-constructs/shared-config/networking';
import { TokenServiceStackProps } from './deploy/stack';
import {
  COGNITO_PORTAL_APP_CLIENT_ID_PARAMETER_NAME,
  DEFAULT_COGNITO_USER_POOL_ID_PARAMETER_NAME,
} from '@orcabus/platform-cdk-constructs/api-gateway';
import {
  JWT_SECRET_NAME,
  SERVICE_USER_SECRET_NAME,
} from '@orcabus/platform-cdk-constructs/shared-config/secrets';

export const getTokenServiceStackProps = (): TokenServiceStackProps => {
  return {
    serviceUserSecretName: SERVICE_USER_SECRET_NAME,
    jwtSecretName: JWT_SECRET_NAME,
    vpcProps: VPC_LOOKUP_PROPS,
    cognitoUserPoolIdParameterName: DEFAULT_COGNITO_USER_POOL_ID_PARAMETER_NAME,
    cognitoPortalAppClientIdParameterName: COGNITO_PORTAL_APP_CLIENT_ID_PARAMETER_NAME,
  };
};
