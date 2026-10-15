import type { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../app.module";
import { loadConfig } from "../config";
import type { ConsoleConfig } from "../config/console-config";
import { ConfigEnv } from "../config/console-config";
import type { Dapp, DappFields } from "../domain/dapp";
import type { SessionUser } from "../modules/auth/session-user";
import { DappsService } from "../modules/dapps/dapps.service";
import { DappEntity } from "../modules/dapps/entities/dapp.entity";
import { SettingsService } from "../modules/settings/settings.service";
import { runScript } from "./run-script";

export const SEED_STATES = ["pending", "approved", "change-requested", "rejected", "removed"] as const;
export type SeedState = (typeof SEED_STATES)[number];

type SeedResult = { state: SeedState; ownerEmail: string; dapp: Dapp | null };

const SEED_ADMIN: SessionUser = { sub: "seed|admin", email: "seed-admin@example.com", emailVerified: true, role: "admin" };
const REJECTION_REASON = "Seeded rejection: please host the logo on a domain you control.";

export function assertSeedAllowed(config: ConsoleConfig): void {
    const { env } = config.server;
    const local = env === ConfigEnv.Development || env === ConfigEnv.Test;
    const slackOn = config.slack.webhookUrl !== null;
    if (!local || config.auth0.provisioner !== "fake" || config.email.provider !== "fake" || slackOn) {
        throw new Error(
            `seed runs only with CONFIG_ENV development or test, both adapters fake and SLACK_WEBHOOK_URL empty; ` +
                `got CONFIG_ENV=${env}, AUTH0_PROVISIONER=${config.auth0.provisioner}, EMAIL_PROVIDER=${config.email.provider}, ` +
                `SLACK_WEBHOOK_URL ${slackOn ? "set" : "empty"}`,
        );
    }
}

export const seedOwner = (state: SeedState): SessionUser => ({
    sub: `seed|${state}`,
    email: `seed-${state}@example.com`,
    emailVerified: true,
    role: "user",
});

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
        mauBracket: "lt1k",
    };
}

async function seedDapp(dapps: DappsService, state: SeedState): Promise<Dapp> {
    const owner = seedOwner(state);
    const fields = seedFields(state);
    const submitted = await dapps.submit(owner, fields);
    const approve = (): Promise<Dapp> => dapps.approve(SEED_ADMIN, submitted.id, submitted.version);
    switch (state) {
        case "pending":
            return submitted;
        case "approved":
            return approve();
        case "change-requested": {
            const approved = await approve();
            const change = {
                name: `${fields.name} v2`,
                callbackUrls: [...fields.callbackUrls, `${fields.webOrigins[0]}/v2/callback`],
            };
            return dapps.editOwn(owner, approved.id, approved.version, { ...fields, ...change });
        }
        case "rejected":
            return dapps.reject(SEED_ADMIN, submitted.id, submitted.version, REJECTION_REASON);
        case "removed": {
            const approved = await approve();
            return dapps.removeOwn(owner, approved.id, approved.version);
        }
    }
}

export async function runSeed(app: INestApplicationContext): Promise<SeedResult[]> {
    if ((await app.get(SettingsService).get()).autoApproval.enabled) {
        throw new Error("Auto-approval is on: turn it off before seeding, or the pending and rejected dApps would be approved");
    }
    const dapps = app.get(DappsService);
    const { manager } = app.get(DataSource);
    const results: SeedResult[] = [];
    for (const state of SEED_STATES) {
        const ownerEmail = seedOwner(state).email;
        const exists = await manager.existsBy(DappEntity, { ownerEmail });
        results.push({ state, ownerEmail, dapp: exists ? null : await seedDapp(dapps, state) });
    }
    return results;
}

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
