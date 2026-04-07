# CSD Platform — AWS Deployment Guide

> **Last updated:** 2026-04-07
> **Status:** Етапи 0–2 завершені, Етапи 3–5 в процесі

## Content

- Етап 0: Підготовка AWS CLI + IAM
- Етап 1: RDS PostgreSQL
- Етап 2: Backend (NestJS → Lambda + API Gateway)
- Етап 3: Frontend (Angular SSR → Lambda + S3 + CloudFront)
- Етап 4: Домен + SSL
- Етап 5: CI/CD (автодеплой)
- Додаток A: Troubleshooting Log
- Додаток B: Ключові ресурси AWS
- Додаток C: Безпека — Checklist

---

## Architecture

```
                    ┌─────────────┐
                    │  CloudFront │  ← CDN + маршрутизація
                    └──────┬──────┘
                     ┌─────┴─────┐
              *.js,css,img    /*  (SSR)
                 ↓               ↓
           ┌─────┴─────┐  ┌─────┴──────┐
           │     S3     │  │  Lambda    │  ← Angular SSR
           │  (static)  │  │  (SSR)     │
           └────────────┘  └────────────┘

           ┌────────────────────────────┐
           │  API Gateway + Lambda      │  ← NestJS Backend
           │  /prod/*                   │
           └────────────┬───────────────┘
                        ↓
                 ┌──────┴──────┐
                 │ RDS Postgres │  ← PostgreSQL 16.13
                 │ db.t4g.micro │
                 └─────────────┘
```

**Оцінка вартості після Free Tier: ~$20-30/міс**

---

## Етап 0: Підготовка AWS CLI + IAM ✅

### 0.1 Встановити AWS CLI

```bash
brew install awscli
aws --version
# aws-cli/2.x.x
```

### 0.2 Створити IAM User

1. AWS Console → IAM → Users → **Create user**
2. Username: `CsD_user`
3. Permissions: **AdministratorAccess**

> **⚠️ LESSON LEARNED:** Спочатку додавали окремі policies по одній
> (AmazonRDSFullAccess, AWSLambda_FullAccess, тощо), але Serverless Framework
> потребує багато різних дозволів (CloudFormation, SSM, S3, IAM roles, Lambda, API Gateway).
> Кожен deploy натикався на нову відсутню policy. Рішення: використати
> `AdministratorAccess` на етапі розробки. Для production слід створити
> кастомну policy з мінімально необхідними дозволами.

> **⚠️ LESSON LEARNED:** Після attach нової IAM policy потрібно чекати
> до 15-20 хвилин поки вона повністю пропагується через AWS. При спробі
> відразу після attach отримували ту ж помилку "not authorized".

### 0.3 Налаштувати AWS CLI

```bash
aws configure
# Region: eu-central-1 (Frankfurt — найближчий до України)
# Output: json
```

### 0.4 Перевірити

```bash
aws sts get-caller-identity
# {
#     "UserId": "<UserID>",
#     "Account": "<AWS Account>",
#     "Arn": "arn:aws:iam::********:user/CsD_user"
# }
```

### 0.5 Встановити Serverless Framework

```bash
npm install -g serverless
serverless --version
# Serverless ϟ Framework 4.33.3
```

> **⚠️ LESSON LEARNED:** Serverless Framework v4 вимагає акаунт на serverless.com.
> При першому `serverless deploy` з'являється інтерактивний prompt з вибором
> Login/Register. Це безкоштовно для організацій з доходом < $2M.
> Після логіну потрібно додати `org: csd2019` у `serverless.yml`.

---

## Етап 1: RDS PostgreSQL ✅

### 1.1 Отримати Default VPC ID

```bash
aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text
# <VPC ID>
```

### 1.2 Створити Security Group

```bash
aws ec2 create-security-group \
  --group-name csd-rds-sg \
  --description "Security group for CSD RDS PostgreSQL" \
  --vpc-id <VPC ID>
# GroupId: <Security Group ID>
```

### 1.3 Налаштувати Ingress Rules

```bash
# Ваш IP для локальної розробки
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress \
  --group-id <Security Group ID> \
  --protocol tcp --port 5432 --cidr ${MY_IP}/32

# VPC CIDR (для Lambda в тому ж VPC)
aws ec2 authorize-security-group-ingress \
  --group-id <Security Group ID> \
  --protocol tcp --port 5432 --cidr 172.31.0.0/16

# Відкрити для всіх (тимчасово для Lambda поза VPC)
aws ec2 authorize-security-group-ingress \
  --group-id <Security Group ID> \
  --protocol tcp --port 5432 --cidr 0.0.0.0/0
```

> **⚠️ LESSON LEARNED:** Lambda за замовчуванням працює ПОЗА VPC і підключається
> до RDS через публічний IP. Правило `172.31.0.0/16` (VPC CIDR) НЕ покриває
> цей сценарій. Довелося додати `0.0.0.0/0` для порту 5432.
> Це прийнятно на dev (доступ захищений паролем + SSL), але на production
> слід перемістити Lambda у VPC або використати RDS Proxy.

### 1.4 Створити RDS інстанс

```bash
aws rds create-db-instance \
  --db-instance-identifier csd-postgres \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.13 \
  --master-username csd_admin \
  --master-user-password '❗️<CHANGE PASSWORD>' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids <Security Group ID> \
  --db-name csd \
  --backup-retention-period 1 \
  --no-multi-az \
  --publicly-accessible \
  --storage-encrypted \
  --region eu-central-1
```

> **⚠️ LESSON LEARNED: Free Tier обмеження**
> - `--backup-retention-period 7` → помилка `FreeTierRestrictionError`.
    >   Free Tier дозволяє максимум `1` день бекапів. Змінили на `1`.
> - `--engine-version 16.4` → помилка `Cannot find version 16.4`.
    >   Версія 16.4 не доступна в eu-central-1. Перевірити доступні версії:
    >   `aws rds describe-db-engine-versions --engine postgres --query "DBEngineVersions[*].EngineVersion"`
    >   Використали `16.13`.

> **⚠️ LESSON LEARNED: Пароль БД**
> - Уникати символів `|`, `#`, `\` в паролі — вони конфліктують з shell.
> - Формат пароля: `CsD_Pr0d_2026xKz9` (літери, цифри, `_`, `!`).
> - НІКОЛИ не показувати пароль у відкритому вигляді в логах/чатах.

### 1.5 Перевірити статус та підключення

```bash
# Чекати 5-10 хвилин поки статус стане "available"
aws rds describe-db-instances \
  --db-instance-identifier csd-postgres \
  --query "DBInstances[0].DBInstanceStatus" --output text

# Отримати endpoint
aws rds describe-db-instances \
  --db-instance-identifier csd-postgres \
  --query "DBInstances[0].Endpoint.Address" --output text
# <RDS Endpoint>

# Перевірити підключення
psql -h <RDS Endpoint> -U csd_admin -d csd
# psql (14.19, server 16.13) — OK, працює
```

### Результат Етапу 1

```
DB_HOST=<RDS Endpoint>
DB_PORT=5432
DB_USERNAME=csd_admin
DB_NAME=csd
```

---

## Етап 2: Backend (NestJS → Lambda) ✅

### 2.1 Створити Lambda entry point

Файл `backend/src/lambda.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import express from 'express';
import { AppModule } from './app.module';

let cachedServer: any;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler = async (event: any, context: any, callback: any) => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(event, context, callback);
};
```

### 2.2 Встановити залежності

```bash
npm install @codegenie/serverless-express
npm install -D serverless-offline --legacy-peer-deps
```

> **⚠️ LESSON LEARNED: serverless-plugin-typescript несумісний з Serverless v4**
> `serverless-plugin-typescript@2.1.5` має peer dependency `serverless@"2 || 3"`,
> що конфліктує з `serverless@4.33.3`. Рішення: НЕ використовувати цей плагін.
> Замість цього — білдити NestJS окремо через `npm run build` (nest build),
> і в `serverless.yml` handler вказує на `dist/lambda.handler` (скомпільований JS).

### 2.3 Створити serverless.yml

Файл `backend/serverless.yml`:

```yaml
org: csd2019
service: csd-api

provider:
  name: aws
  runtime: nodejs22.x
  region: eu-central-1
  stage: ${opt:stage, 'dev'}
  memorySize: 512
  timeout: 29
  environment:
    NODE_ENV: production
    DB_HOST: ${env:DB_HOST}
    DB_PORT: '5432'
    DB_USERNAME: ${env:DB_USERNAME}
    DB_PASSWORD: ${env:DB_PASSWORD}
    DB_NAME: ${env:DB_NAME}
    JWT_SECRET: ${env:JWT_SECRET}
    FRONTEND_URL: ${env:FRONTEND_URL, ''}

functions:
  api:
    handler: dist/lambda.handler
    events:
      - http:
          method: ANY
          path: /
          cors: true
      - http:
          method: ANY
          path: /{proxy+}
          cors: true

package:
  patterns:
    - 'dist/**'
    - 'node_modules/**'
    - '!node_modules/.cache/**'
    - '!src/**'
    - '!test/**'
    - '!.env*'
    - '!coverage/**'
```

> **Ключові моменти:**
> - `org: csd2019` — обов'язково для Serverless v4 (прив'язка до акаунту serverless.com)
> - `handler: dist/lambda.handler` — вказує на скомпільований JS (не TS)
> - Немає секції `plugins` — TypeScript компіляція виконується окремо через `nest build`
> - `timeout: 29` — максимум для API Gateway (30с), NestJS bootstrap може бути повільним

### 2.4 Створити .env.production

```bash
# backend/.env.production — НЕ КОМІТИТИ!
DB_HOST=<RDS <Endpoint>
DB_PORT=5432
DB_USERNAME=csd_admin
DB_PASSWORD=<PASSWORD>
DB_NAME=csd
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
FRONTEND_URL=https://www.csd-fund.org
SUPER_ADMIN_EMAIL=admin@csd-fund.org
```

### 2.5 Додати SSL в TypeORM конфігурацію

В `app.module.ts` — змінити TypeORM config:

```typescript
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),
    autoLoadEntities: true,
    synchronize: config.get<string>('NODE_ENV') !== 'production',
    ssl: config.get<string>('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
  }),
}),
```

> **⚠️ LESSON LEARNED: RDS вимагає SSL для підключень з-поза VPC**
> Без `ssl: { rejectUnauthorized: false }` Lambda отримує помилку:
> `no pg_hba.conf entry for host "3.77.42.24", user "csd_admin", database "csd", no encryption`
> Це стосується і seed-скриптів, які запускаються з локальної машини
> через публічний IP — кожний DataSource повинен мати `ssl` налаштування
> коли `NODE_ENV=production`.

### 2.6 Деплой

```bash
cd backend
npm run build
export $(cat .env.production | grep -v '^#' | xargs)
npx serverless deploy --stage prod
```

**Результат:**
```
endpoints:
  ANY - ********
  ANY - ********
functions:
  api: csd-api-prod-api (27 MB)
```

### 2.7 Перевірка

```bash
********
# 🙋‍♂️🙋🏼‍♀️ Hello CSD web-portal
```

### 2.8 Seed Production DB

> **⚠️ LESSON LEARNED: Production DB порожня — таблиці не існують**
> Seed-скрипти з `synchronize: false` отримують помилку
> `relation "users" does not exist`. Рішення: тимчасово додати
> `synchronize: true` в DataSource seed-скриптів, щоб TypeORM
> створив таблиці автоматично. Потім також задеплоїти backend
> з `synchronize: true` (один раз), щоб створити ВСІ таблиці
> (posts, partners, wash_forms тощо), після чого повернути назад.

> **⚠️ LESSON LEARNED: SSL потрібен і в seed-скриптах**
> Seed-скрипти (`seed-super-admin.ts`, `run-seeds-standalone.ts`)
> запускаються з локальної машини з `NODE_ENV=production` і
> підключаються до RDS через публічний IP. Без `ssl` отримують
> ту ж помилку `no pg_hba.conf entry`. Рішення: додати
> `ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false`
> в кожний DataSource в seed-скриптах.

Файл `backend/src/database/run-seeds-standalone.ts` для equipment seed:

```typescript
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { EquipmentCategory } from '../modules/equipment-catalog/entities/equipment-category.entity';
import { EquipmentItem } from '../modules/equipment-catalog/entities/equipment-item.entity';
import { seedEquipmentCatalog } from './seed-equipment';

config();

async function run(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'csd',
    entities: [EquipmentCategory, EquipmentItem],
    synchronize: true,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  await ds.initialize();
  await seedEquipmentCatalog(ds);
  await ds.destroy();
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
```

**Seed результати:**
```bash
npx ts-node -r tsconfig-paths/register src/database/seed-super-admin.ts
# ✅ Created super_admin: v.krupka.csd@gmail.com

npx ts-node -r tsconfig-paths/register src/database/run-seeds-standalone.ts
# Equipment catalog seeded: 21 categories, 230 items.
```

### Діагностика Lambda

```bash
# Логи Lambda
npx serverless logs -f api --stage prod --region eu-central-1
```

### Результат Етапу 2

```
API Endpoint: ********
Lambda Function: csd-api-prod-api (27 MB, 512 MB RAM)
Runtime: nodejs22.x
Region: eu-central-1
```

---

## Етап 3: Frontend (Angular SSR → Lambda + S3 + CloudFront) ⏳

### 3.1 Оновити environment.prod.ts

```typescript
export const environment = {
  production: true,
  apiUrl: '********',
};
```

### 3.2 Build Angular SSR

```bash
cd ui
ng build --configuration production
# dist/ui/browser/ — статичні файли
# dist/ui/server/  — SSR серверний код
```

### 3.3 Створити S3 bucket

```bash
aws s3 mb s3://csd-fund-static --region eu-central-1
```

### 3.4 Завантажити статику

```bash
aws s3 sync dist/ui/browser/ s3://csd-fund-static/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

aws s3 cp dist/ui/browser/index.html s3://csd-fund-static/index.html \
  --cache-control "public, max-age=0, must-revalidate"
```

### 3.5 CloudFront Distribution

TODO: Створити через AWS Console з маршрутизацією:
- `*.js, *.css, assets/*` → S3
- `Default (*)` → SSR Lambda

### 3.6 S3 Bucket Policy для CloudFront OAC

TODO: Після створення CloudFront distribution

---

## Етап 4: Домен + SSL ⏳

### 4.1 SSL сертифікат — ОБОВ'ЯЗКОВО в us-east-1

```bash
aws acm request-certificate \
  --domain-name csd-fund.org \
  --subject-alternative-names "*.csd-fund.org" \
  --validation-method DNS \
  --region us-east-1
```

### 4.2–4.5

TODO

---

## Етап 5: CI/CD ⏳

Файл `.github/workflows/deploy.yml` — TODO

---

## Додаток A: Troubleshooting Log

### Проблема 1: FreeTierRestrictionError (backup-retention-period)

```
An error occurred (FreeTierRestrictionError) when calling the CreateDBInstance operation:
The specified backup retention period exceeds the maximum available to free tier customers.
```

**Причина:** Free Tier обмежує backup retention до 1 дня.
**Рішення:** `--backup-retention-period 1` замість `7`.

---

### Проблема 2: Cannot find version 16.4 for postgres

```
An error occurred (InvalidParameterCombination): Cannot find version 16.4 for postgres
```

**Причина:** Версія 16.4 не доступна в eu-central-1.
**Діагностика:**
```bash
aws rds describe-db-engine-versions --engine postgres \
  --query "DBEngineVersions[*].EngineVersion" --output table
```
**Рішення:** Використати `16.13` (або найновішу доступну 16.x).

---

### Проблема 3: serverless-plugin-typescript peer dependency conflict

```
Could not resolve dependency:
peer serverless@"2 || 3" from serverless-plugin-typescript@2.1.5
```

**Причина:** Плагін не підтримує Serverless v4.
**Рішення:** Не використовувати `serverless-plugin-typescript`. Білдити окремо:
1. `npm run build` (nest build → dist/)
2. В `serverless.yml`: `handler: dist/lambda.handler`
3. Без секції `plugins`

---

### Проблема 4: IAM permissions — поступове додавання policies

```
User is not authorized to perform: cloudformation:DescribeStackResource
User is not authorized to perform: ssm:PutParameter
```

**Причина:** Serverless Framework потребує доступ до CloudFormation, SSM, S3, IAM, Lambda, API Gateway одночасно.
**Рішення:** `AdministratorAccess` на етапі розробки.
**Нюанс:** Після attach policy потрібно чекати **до 15-20 хвилин** поки вона повністю пропагується.

---

### Проблема 5: Serverless v4 вимагає акаунт

При першому deploy з'являється prompt:
```
Serverless Framework V4 CLI requires an account or a license key.
❯ Login/Register
```

**Рішення:** Обрати Login/Register → безкоштовно для < $2M revenue.
Після реєстрації додати `org: csd2019` першим рядком у `serverless.yml`.

---

### Проблема 6: Lambda timeout — не підключається до RDS

```
curl → {"message": "Endpoint request timed out"}
```

**Причина:** Lambda працює поза VPC і підключається до RDS через публічний IP.
Security Group дозволяв доступ лише з конкретного IP та VPC CIDR (172.31.0.0/16),
але Lambda має випадковий AWS IP поза цим діапазоном.

**Рішення (dev):**
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <Security Group ID> \
  --protocol tcp --port 5432 --cidr 0.0.0.0/0
```
**Рішення (prod):** Перемістити Lambda у VPC або використати RDS Proxy.

---

### Проблема 7: RDS вимагає SSL — "no encryption"

```
error: no pg_hba.conf entry for host "3.77.42.24", user "csd_admin",
database "csd", no encryption
```

**Причина:** RDS з `--storage-encrypted` вимагає SSL-підключення від зовнішніх IP.
TypeORM за замовчуванням підключається без SSL.

**Рішення в app.module.ts:**
```typescript
ssl: config.get<string>('NODE_ENV') === 'production'
  ? { rejectUnauthorized: false }
  : false,
```

**ВАЖЛИВО:** Та ж SSL-конфігурація потрібна в КОЖНОМУ DataSource —
включаючи seed-скрипти (`seed-super-admin.ts`, `run-seeds-standalone.ts`).

---

### Проблема 8: Seed fails — "relation users does not exist"

```
QueryFailedError: relation "users" does not exist
```

**Причина:** Production RDS порожня, таблиці не створені.
Seed-скрипт з `synchronize: false` не створює таблиці.

**Рішення (поетапне):**
1. Тимчасово `synchronize: true` в seed-скриптах → створює таблиці для entities в скрипті
2. Тимчасово `synchronize: true` в `app.module.ts` → deploy → один curl → створює ВСІ таблиці
3. Повернути `synchronize: false` / `!== 'production'`

**На майбутнє:** Використати TypeORM migrations замість synchronize.

---

## Додаток B: Ключові ресурси AWS

| Ресурс | Ідентифікатор                             |
|---|-------------------------------------------|
| VPC | `<VPC ID>`                   |
| Security Group (RDS) | `<Security Group ID>` |
| RDS Instance | `csd-postgres`                            |
| RDS Endpoint | `<RDS Endpoint>`                          |
| API Gateway URL | `********`                                |
| Lambda Function | `csd-api-prod-api`                        |
| Region | `eu-central-1` (Frankfurt)                |
| IAM User | `CsD_user`                                |
| Serverless Org | `csd2019`                                 |
| AWS Account | `<AWS Account>`                           |

---

## Додаток C: Безпека — Checklist

- [x] `.env.production` в `.gitignore`
- [x] RDS password не в коді/логах
- [x] SSL увімкнений для RDS підключень
- [x] JWT_SECRET — 64 bytes random hex
- [ ] Закрити `0.0.0.0/0` на Security Group (після переміщення Lambda у VPC)
- [ ] Вимкнути `publicly-accessible` на RDS (після переміщення Lambda у VPC)
- [ ] TypeORM `synchronize: false` в production (використовувати migrations)
- [ ] API Gateway throttling
- [ ] WAF перед CloudFront (опціонально)
- [ ] Rotація паролів та JWT_SECRET
