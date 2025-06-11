import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { AuthorizationManagerStackProps } from './stack';
import {
  AUTH_STACK_HTTP_LAMBDA_AUTHORIZER_PARAMETER_NAME,
  DEFAULT_COGNITO_USER_POOL_ID_PARAMETER_NAME,
} from '@orcabus/platform-cdk-constructs/api-gateway';
import { REGION, accountIdAlias } from '@orcabus/platform-cdk-constructs/shared-config/accounts';

export const getAuthorizationManagerStackProps = (
  stage: StageName
): AuthorizationManagerStackProps => {
  return {
    cognito: {
      userPoolIdParameterName: DEFAULT_COGNITO_USER_POOL_ID_PARAMETER_NAME,
      region: REGION,
      accountNumber: accountIdAlias[stage],
    },
    authStackHttpLambdaAuthorizerParameterName: AUTH_STACK_HTTP_LAMBDA_AUTHORIZER_PARAMETER_NAME,
  };
};
