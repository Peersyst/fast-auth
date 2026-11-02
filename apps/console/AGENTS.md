# AGENTS.md

Guidance for AI coding agents working in `apps/console`. `CLAUDE.md` is a symlink to this file.

The console is a NestJS 11 API in `src/` and a Vite React SPA in `web/` (package `console-web`). The API serves the SPA's build. `README.md` lists the commands, the checks CI runs, the configuration and the operations scripts.

## Conventions

The console follows Peersyst conventions. In short:

-   String enums with UPPER_SNAKE members, `Record<K, V>` over index signatures, no `any` (ESLint enforces it).
-   In the API, JSDoc on every function and method except controller routes, as a capitalised sentence ending in a full stop, with `@param name Description.` and no hyphen. The SPA turns this rule off.
-   Each module has `requests/*.request.ts` and `responses/*.response.ts`. Responses build themselves with `static from<Source>()`, or a named factory such as `HealthResponse.ok()` when they have no source.
-   Each module's error codes are an `enum XErrorCode` plus an `XErrorBody: Record<XErrorCode, ...>`, merged into one map.
-   Tables are snake_case. Migrations come from `pnpm migration:generate`, never `synchronize`.
-   Tests live under `test/`, never `src/`. Unit specs mirror `src/` and build their subject with `Test.createTestingModule`. Integration specs live in `test/integration/<module>/`.
-   Dependencies are pinned to exact versions.

## Deliberate divergences from Peersyst conventions

Do not "fix" these back to the conventional style. Each one was chosen.

-   Config is one zod schema, `loadConfig()` in `src/config/index.ts`, served through `ConfigModule.forRoot({ load, skipProcessEnv })` and read as `ConfigService<ConsoleConfig, true>.get("x.y", { infer: true })`. `buildConfig` from `@backend/config` cannot express the cross-field rules, such as refusing the fake adapters in production.
-   The API's services reach the database through `DappsRepository`, `DappEventsRepository` and `SettingsRepository`, not `@InjectRepository`. `HealthService`'s readiness check, the dApp status gauge and the ops scripts in `src/scripts/` query the `DataSource` directly.
-   Tables keep their plural names (`dapps`, `dapp_events`, `settings`, `setting_events`). Their migrations were already pushed for review, and the Peersyst singular-table convention would need a rename migration.
-   Controllers call the response factories, not services, because `src/scripts/seed.ts` reuses the services and one dApp maps to three response shapes.
-   Errors are `ConsoleException(code, details?)` with the body `{ statusCode, code, message, details? }`, handled by the catch-all `ConsoleExceptionFilter`. Admin lists page as `{ items, total, page, pageSize }`. Neither uses `@backend/core`.
-   Authentication and roles are global `APP_GUARD`s with `@Public()` and `@Roles()` opt-outs, not per-route guard decorators.
-   Integration specs boot the whole `AppModule` through `configureApp()`, as `main.ts` does, against the `console_e2e` database. Unit specs use a real `ConfigService` built from the typed `test/utils/test-config.ts`, not a `ConfigServiceMock`.
-   `nest build` and `pnpm start` run without webpack. `src/database/data-source.ts` finds the migrations with a filesystem glob, which a webpack bundle breaks: the API then starts with no tables. The API's one runtime workspace dependency, `@shared/console-domain`, runs from the compiled output that `genesys bundle` produces. The base image, the `Bundle the console domain` CI step and the README's local setup all run it first.
-   `ProvisioningScheduler` runs the Auth0 health check with `setInterval`, not `@nestjs/schedule`, because its interval comes from config (`AUTH0_HEALTH_CHECK_INTERVAL_MS`).
-   Entities and migrations live in the app (`src/modules/*/entities`, `src/database/migrations`), not in a `packages/database` package, because no other app uses the console's database.
-   `pnpm spec` writes `openapi-spec.json`, not `main.ts` at startup. The release image runs as `node` with a root-owned `/app`, so a write at startup would crash it. CI fails when the committed file drifts.
-   `main.ts` serves Prometheus metrics from its own `prom-client` server on `METRICS_PORT`, not through `PrometheusModule`, so the API itself never serves `/metrics`.
-   The domain rules live in `@shared/console-domain` (`packages/shared/console-domain`), which both the API and the SPA import. `console` depends on `console-web` to copy its build, so the SPA can't import `console` itself without a cycle.

## Keep these in sync

-   After changing a controller, a request or a response, run `pnpm spec` and commit `openapi-spec.json`. CI fails on drift, and the SPA generates its API types from that file.
-   After changing an entity, run `pnpm migration:generate`, then `pnpm migration:check`.
-   A new environment variable goes into the schema in `src/config/`, `.env.example` (which documents every key), `test/utils/test-config.ts`, and `test/env.cjs` when the integration suite needs it.
-   `@shared/console-domain` stays free of Nest and TypeORM and keeps 100% unit test coverage.
-   `pnpm test:integration` and `pnpm migration:check` drop and rebuild `console_e2e`, and `pnpm spec` uses it too. Run one at a time.
