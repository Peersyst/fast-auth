import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { createServer } from "node:http";
import { collectDefaultMetrics, register } from "prom-client";
import { AppModule } from "./app.module";
import { loadConfig } from "./config";
import type { ConsoleConfig } from "./config/console-config";
import { configureApp } from "./configure-app";
import { runMigrations } from "./database/migrate";

const logger = new Logger("Metrics");

/**
 * Serves Prometheus metrics on their own port, outside the API.
 * @param server The server config section.
 */
function startMetricsServer({ env: environment, metricsPort }: ConsoleConfig["server"]): void {
    collectDefaultMetrics();
    register.setDefaultLabels({ app: "console", environment });
    createServer((req, res) => {
        if (req.method !== "GET" || req.url !== "/metrics") {
            res.writeHead(404).end();
            return;
        }
        register.metrics().then(
            (metrics) => res.writeHead(200, { "Content-Type": register.contentType }).end(metrics),
            () => res.writeHead(500).end(),
        );
    })
        .on("error", (error) => logger.error(`Metrics server is down: ${error.message}`, error.stack))
        .listen(metricsPort)
        .unref();
}

/**
 * Migrates the database, then starts the API and the metrics server.
 */
async function bootstrap(): Promise<void> {
    const config = loadConfig();
    await runMigrations(config);
    const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), { bufferLogs: true });
    configureApp(app, config);
    app.enableShutdownHooks();
    await app.listen(config.server.port);
    startMetricsServer(config.server);
}

bootstrap();
