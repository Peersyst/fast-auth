import { NestFactory } from "@nestjs/core";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "../app.module";
import { loadConfig } from "../config";
import { API_PREFIX, createOpenApiDocument } from "../configure-app";

const SPEC_PATH = join(__dirname, "..", "..", "openapi-spec.json");

async function main(): Promise<void> {
    const app = await NestFactory.create(AppModule.forRoot(loadConfig()), { logger: ["error", "warn"], abortOnError: false });
    app.setGlobalPrefix(API_PREFIX);
    writeFileSync(SPEC_PATH, `${JSON.stringify(createOpenApiDocument(app), null, 4)}\n`);
    await app.close();
}

main().catch((error: unknown) => {
    process.stderr.write(`spec failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
