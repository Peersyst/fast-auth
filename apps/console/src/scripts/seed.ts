import type { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../app.module";
import { loadConfig } from "../config";
import type { ConsoleConfig } from "../config/console-config";
import { Auth0ProvisionerName, ConfigEnv, EmailProviderName } from "../config/console-config";
import type { Dapp, DappFields } from "@shared/console-domain/dapp";
import { MauBracket } from "@shared/console-domain/dapp";
import type { SessionUser } from "../modules/auth/session-user";
import { Role } from "../modules/auth/session-user";
import { DappsService } from "../modules/dapps/dapps.service";
import { DappEntity } from "../modules/dapps/entities/dapp.entity";
import { SettingsService } from "../modules/settings/settings.service";
import { runScript } from "./run-script";

export enum SeedState {
    PENDING = "pending",
    APPROVED = "approved",
    CHANGE_REQUESTED = "change-requested",
    REJECTED = "rejected",
    REMOVED = "removed",
}

type SeedResult = { state: SeedState; ownerEmail: string; dapp: Dapp | null };

const SEED_ADMIN: SessionUser = { sub: "seed|admin", email: "seed-admin@example.com", emailVerified: true, role: Role.ADMIN };
const REJECTION_REASON = "Seeded rejection: please host the logo on a domain you control.";

/**
 * Throws unless the config is local and every outside effect is faked, so a seed cannot reach real Auth0, email or Slack.
 * @param config The console config.
 */
export function assertSeedAllowed(config: ConsoleConfig): void {
    const { env } = config.server;
    const local = env === ConfigEnv.DEVELOPMENT || env === ConfigEnv.TEST;
    const slackOn = config.slack.webhookUrl !== null;
    if (!local || config.auth0.provisioner !== Auth0ProvisionerName.FAKE || config.email.provider !== EmailProviderName.FAKE || slackOn) {
        throw new Error(
            `seed runs only with CONFIG_ENV development or test, both adapters fake and SLACK_WEBHOOK_URL empty; ` +
                `got CONFIG_ENV=${env}, AUTH0_PROVISIONER=${config.auth0.provisioner}, EMAIL_PROVIDER=${config.email.provider}, ` +
                `SLACK_WEBHOOK_URL ${slackOn ? "set" : "empty"}`,
        );
    }
}

/**
 * Builds the owner of the seeded dApp in a state, whose email is unique to that state.
 * @param state The seed state.
 * @returns The owner.
 */
export const seedOwner = (state: SeedState): SessionUser => ({
    sub: `seed|${state}`,
    email: `seed-${state}@example.com`,
    emailVerified: true,
    role: Role.USER,
});

/**
 * Builds valid form fields for the seeded dApp in a state, on hosts under example.com.
 * @param state The seed state.
 * @returns The dApp fields.
 */
export function seedFields(state: SeedState): DappFields {
    const host = `${state}.seed.example.com`;
    return {
        name: `Seed ${state}`,
        description: `A dApp seeded in the ${state} state for local development.`,
        logoUrl: `https://${host}/logo.png`,
        callbackUrls: [`https://${host}/callback`],
        logoutUrls: [`https://${host}/`],
        webOrigins: [`https://${host}`],
        contactEmail: `team@${host}`,
        mauBracket: MauBracket.LT_1K,
    };
}

/**
 * Submits a dApp and drives it through the service to the given state, sending its emails to the fake provider.
 * @param dapps The dApps service.
 * @param state The state to reach.
 * @returns The dApp in that state.
 */
async function seedDapp(dapps: DappsService, state: SeedState): Promise<Dapp> {
    const owner = seedOwner(state);
    const fields = seedFields(state);
    const submitted = await dapps.submit(owner, fields);
    const approve = (): Promise<Dapp> => dapps.approve(SEED_ADMIN, submitted.id, submitted.version);
    switch (state) {
        case SeedState.PENDING:
            return submitted;
        case SeedState.APPROVED:
            return approve();
        case SeedState.CHANGE_REQUESTED: {
            const approved = await approve();
            const change = {
                name: `${fields.name} v2`,
                callbackUrls: [...fields.callbackUrls, `${fields.webOrigins[0]}/v2/callback`],
            };
            return dapps.editOwn(owner, approved.id, approved.version, { ...fields, ...change });
        }
        case SeedState.REJECTED:
            return dapps.reject(SEED_ADMIN, submitted.id, submitted.version, REJECTION_REASON);
        case SeedState.REMOVED: {
            const approved = await approve();
            return dapps.removeOwn(owner, approved.id, approved.version);
        }
    }
}

/**
 * Seeds one dApp per state, skipping each owner that already has a dApp, and refuses while auto-approval is on.
 * @param app The Nest application context.
 * @returns One result per state, with a null dApp where it skipped.
 */
export async function runSeed(app: INestApplicationContext): Promise<SeedResult[]> {
    if ((await app.get(SettingsService).get()).autoApproval.enabled) {
        throw new Error("Auto-approval is on: turn it off before seeding, or the pending and rejected dApps would be approved");
    }
    const dapps = app.get(DappsService);
    const { manager } = app.get(DataSource);
    const results: SeedResult[] = [];
    for (const state of Object.values(SeedState)) {
        const ownerEmail = seedOwner(state).email;
        const exists = await manager.existsBy(DappEntity, { ownerEmail });
        results.push({ state, ownerEmail, dapp: exists ? null : await seedDapp(dapps, state) });
    }
    return results;
}

/**
 * Checks the config, seeds the database and prints one line per state.
 */
async function main(): Promise<void> {
    const config = loadConfig();
    assertSeedAllowed(config);
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(config), { logger: ["error", "warn"], abortOnError: false });
    try {
        for (const { state, ownerEmail, dapp } of await runSeed(app)) {
            const outcome =
                dapp === null
                    ? "skipped: this owner already has a dApp"
                    : `created ${dapp.id} (${dapp.status}${dapp.pendingChange === null ? "" : ", change under review"})`;
            process.stdout.write(`${state.padEnd(16)} ${ownerEmail.padEnd(36)} ${outcome}\n`);
        }
    } finally {
        await app.close();
    }
}

if (require.main === module) runScript("seed", main);
