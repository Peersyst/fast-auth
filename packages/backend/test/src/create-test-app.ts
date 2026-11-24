import { INestApplication, ModuleMetadata, Type, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import supertest from "supertest";

export type ProviderOverride = {
    provide: Type | string | symbol;
    useValue: unknown;
};

export type CreateTestAppOptions = ModuleMetadata & {
    overrides?: ProviderOverride[];
    configure?: (app: INestApplication) => void;
};

export type TestApp = {
    app: INestApplication;
    module: TestingModule;
    request: supertest.Agent;
};

/**
 * Creates a NestJS test application with supertest.
 * Bootstraps the module, applies global validation pipe, and returns
 * the app, module, and a supertest agent for HTTP assertions.
 * @param options Module metadata, optional provider overrides, and an optional hook to configure the app before it starts.
 * @returns The test app, module, and supertest request agent.
 */
export async function createTestApp(options: CreateTestAppOptions): Promise<TestApp> {
    const { overrides = [], configure, ...moduleMetadata } = options;

    let builder = Test.createTestingModule(moduleMetadata);

    for (const override of overrides) {
        builder = builder.overrideProvider(override.provide).useValue(override.useValue);
    }

    const module = await builder.compile();

    const app = module.createNestApplication();
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    configure?.(app);

    await app.init();

    const request = supertest.agent(app.getHttpServer());

    return { app, module, request };
}
