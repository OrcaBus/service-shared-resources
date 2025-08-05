# RDS Postgres Manager

This will deploy lambdas that will connect to the RDS instance with the master credential. This microservice is
responsible for admin Postgres activity that requires superuser access.

You would need to configure this service by passing it as props from the stack level
(`./config/stacks/postgresManager.ts`).

The config should register the microservice name and the connection type to the RDS. The connection can
make use of `rds_iam` or the conventional `user-password` connection string.

The microservice config should look as follows:

```ts
    microserviceDbConfig: [
      {
        name: 'metadata_manager',
        authType: DbAuthType.USERNAME_PASSWORD,
      },
      {
        name: 'filemanager',
        authType: DbAuthType.RDS_IAM
      },
    ]
```

The DbAuthType is defined at the [./function/utils.ts](./function/utils.ts) in this project and it is as follows:

```ts
export enum DbAuthType {
  RDS_IAM,
  USERNAME_PASSWORD,
}
```

Once the configuration has been added, the stack will create the relevant new database and role specified. The SQL
command is executed to the Db with AWS Custom Resource where the configuration has changed.

Changing the microservice authType is also possible by updating the stack props configuration as above. E.g.
the `metadata_manager` is set to `user-pass` connection and a new configuration where it changes to use
`rds_iam`, the changes will update the login details in the database.

NOTE: When deleting a configuration from the props, it will NOT delete/drop any roles or database in the cluster.

## Read-Only User

There is a read-only user (`orcabus_ro`) available for accessing databases with read-only permissions.

> **📝 Important:** New databases require manual permission setup. You must grant appropriate SELECT permissions to `orcabus_ro` for each newly created database.

### Setup Commands for New Databases

Run these commands as the master user to grant read-only access:

```sql
GRANT CONNECT ON DATABASE yourdb TO orcabus_ro;

\c yourdb

GRANT USAGE ON SCHEMA public TO orcabus_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO orcabus_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO orcabus_ro;
```
