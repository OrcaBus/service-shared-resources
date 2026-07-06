import logging
import os
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

client = boto3.client('verifiedpermissions')


def handler(event, context):
    """
    The event example:
    {
        "version": "2.0",
        "type": "REQUEST",
        "routeArn": "arn:aws:execute-api:ap-southeast-2:}{ACC_NUM}:{API_ID}/$default/POST/{FULL_PATH}/",
        "identitySource": [...],
        "routeKey": "POST /api/v1/.../{PROXY+}",
        "rawPath": "/api/v1/...",
        "rawQueryString": "",
        "headers": {
            ...HTTP Headers...
        },
        "requestContext": {
            "accountId": "1234567890",
            "apiId": "123ABCD",
            "domainName": "microservice.umccr.org",
            "domainPrefix": "microservice",
            "http": {
                "method": "POST",
                "path": "/api/v1/.../",
                "protocol": "HTTP/1.1",
                "sourceIp": "123.123.12.123",
                "userAgent": "Mozilla/5.0 ..."
            },
            "requestId": "123ABCD=",
            "routeKey": "POST /api/v1/.../{PROXY+}",
            "stage": "$default",
            "time": "01/Jan/2000:00:00:00 +0000",
            "timeEpoch": 1234567890
        },
        "pathParameters": {
            "PROXY": ""
        }
    }
    """
    response = {
        "isAuthorized": False,
    }

    try:
        auth_token = event.get("headers", {}).get("authorization")

        if auth_token:

            if auth_token.lower().startswith("bearer "):
                auth_token = auth_token.split(" ")[1]

            entityType = event.get("requestContext", {}).get("domainPrefix", "")
            routeKey = event.get("routeKey", "")
            resourceEntityId = entityType.upper()

            # entityType is derived from the API's custom domain subdomain prefix
            # (see README for the DNS-to-microservice-name coupling this relies on).
            # Logged so a mismatch (e.g. a renamed domain) is traceable rather than
            # silently resolving to a deny.
            logger.info(
                "Checking authorization for action=%s resource=OrcaBus::Microservice::%s",
                routeKey,
                resourceEntityId,
            )

            avp_response = client.is_authorized_with_token(
                policyStoreId=os.environ.get("POLICY_STORE_ID"),
                identityToken=auth_token,
                action={
                    "actionType": "OrcaBus::Action",
                    "actionId": routeKey,
                },
                resource={
                    "entityType": "OrcaBus::Microservice",
                    "entityId": resourceEntityId,
                },
            )

            return {
                "isAuthorized": avp_response.get("decision", None) == "ALLOW",
            }
        else:
            return response
    except Exception as e:
        logger.error("ERROR: %s", e)
        return response
