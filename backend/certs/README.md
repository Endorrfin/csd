# `backend/certs/` — AWS RDS CA bundle

`src/database/db-ssl.ts` verifies the RDS server certificate in production. It
needs the AWS CA bundle for **`eu-central-1`**, which is **not** committed by
this PR: it is a supply-chain input, so it gets added by a human who has checked
where it came from.

Nothing here is secret. The bundle is a public AWS certificate and **should** be
committed once verified — that is what makes the production build reproducible.

## Add it

```bash
cd backend/certs
curl -fsSLO https://truststore.pki.rds.amazonaws.com/eu-central-1/eu-central-1-bundle.pem
mv eu-central-1-bundle.pem rds-ca-eu-central-1.pem
```

## Verify before committing

```bash
# Expect several certificates, none expired, all issued by "Amazon RDS".
grep -c 'BEGIN CERTIFICATE' rds-ca-eu-central-1.pem
openssl crl2pkcs7 -nocrl -certfile rds-ca-eu-central-1.pem \
  | openssl pkcs7 -print_certs -noout -text \
  | grep -E 'Subject:|Not After'

# Record the checksum in the commit message so a future rotation is visible.
shasum -a 256 rds-ca-eu-central-1.pem
```

Cross-check the URL against the AWS docs page *"Using SSL/TLS to encrypt a
connection to a DB instance"* before trusting the download.

## Where it is used

| Consumer | How the file is found |
| --- | --- |
| Lambda (`csd-api-prod-api`, `csd-api-staging-api`) | packaged by `serverless.yml` (`certs/**`) and read from `$LAMBDA_TASK_ROOT/certs/` |
| `npm run migration:run` / `migration:show` on a GitHub runner | read from `backend/certs/` — the scripts run with `backend/` as the working directory and `NODE_ENV=production` |
| Local dev | not used. `db-ssl.ts` returns `ssl: false` when `NODE_ENV !== 'production'` |

## Overrides

| Variable | Effect |
| --- | --- |
| `DB_CA_BUNDLE` | inline PEM; wins over the file. Lets a rotated CA ship through a Lambda env var or GitHub secret without a code change |
| `DB_CA_BUNDLE_PATH` | alternative path, absolute or relative to the package root |

## When AWS rotates the CA

RDS certificate authorities expire. Re-run the download above, verify, commit,
and redeploy **before** the expiry date on the current bundle — an expired CA
makes every database connection fail closed, which is the correct behaviour but
an outage nonetheless. Add a CloudWatch alarm reminder or a calendar entry from
the `Not After` date printed by the verify command.
