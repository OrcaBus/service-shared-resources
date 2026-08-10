# Authorization Stack

This stack contains resources that handle authorization requests.

## AWS Verified Permissions

The current stack deploys AWS Verified Permissions, defining an identity source and policies as described below. An HTTP Lambda Authorizer is included for use in stacks where routes/methods need to comply with this policy. The Lambda ARN is stored in an SSM Parameter String defined in `config/constants.ts` as the `authStackHttpLambdaAuthorizerParameterName` constant.

### Identity Source

- **UMCCR Cognito User Pool**

  Sourced from the UMCCR Cognito User Pool, defined in the infrastructure Terraform repository. The AWS Cognito User Pool
  is expected to have groups, which will be used in the policy. Note that the JWT must be generated with the
  latest token containing the proper Cognito group claims for it to work. This also applies when a user is removed from
  the group; the JWT must expire to become invalid.

  The identity source is restricted to the platform's known Cognito app client IDs
  (`clientIdParameterNames` in `config.ts`) — tokens minted by other app clients registered
  under the same user pool are not accepted.

### Group

Policies are currently assigned based on groups from the Cognito User Pool. The policies are defined as data in the `GROUP_POLICIES` array in `stack.ts`, and turned into Cedar `CfnPolicy` resources by `setupGroupPolicies`.

- **Admin**: For admins/service users (all actions are granted to this group).
- **Curators**: For curators (all policies are applied to all curators in this group).
- **Bioinfo**: For bioinformatics members.

### Permissions

| Description                                                                                       | Admin              | Curators           | Bioinfo            |
| ------------------------------------------------------------------------------------------------- | ------------------ | ------------------ | ------------------ |
| Allow rerun workflows in the WORKFLOW microservice                                                | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Allow marking workflow runs as deprecated in the WORKFLOW microservice                            | :white_check_mark: | :white_check_mark: | :x:                |
| Allow marking workflow runs as resolved in the WORKFLOW microservice                              | :white_check_mark: | :x:                | :x:                |
| Allow to sync external metadata in the METADATA microservice                                      | :white_check_mark: | :x:                | :white_check_mark: |
| Allow to link external entities to a case in the CASE microservice                                | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Allow to unlink external entities from a case in the CASE microservice                            | :white_check_mark: | :white_check_mark: | :white_check_mark: |

The `Admin` group receives these permissions through its wildcard policy. The unrestricted workflow
cancel endpoint does not use this authorizer and therefore is not represented in the Cedar schema or
group policies.

NOTE: Please update this table if `GROUP_POLICIES` in `stack.ts` is modified.

### HTTP Lambda Authorizer

The Lambda authorizer maps each request into Cedar terms — the identity token as the
principal, the route (e.g. `POST /api/v1/workflowrun/{orcabusId}/rerun/{proxy+}`) as the
action, and the API's domain prefix, uppercased (e.g. `workflow.umccr.org` → `WORKFLOW`), as
the `OrcaBus::Microservice` resource — then calls AVP's `IsAuthorizedWithToken` to decide
whether to allow the request.
