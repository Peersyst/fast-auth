import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { CLIENT_ID, makeDapp } from "../../utils/dapp";
import { createTestingModuleWithConfig, SES_EMAIL, TEST_CONFIG } from "../../utils/test-config";
import { NearNetwork } from "../../../src/config/console-config";
import { DappEventType, EmailTemplate } from "@shared/console-domain/dapp-event";
import { EMAILER } from "../../../src/modules/notifications/emailer";
import type { Emailer } from "../../../src/modules/notifications/emailer";
import { NotificationsModule } from "../../../src/modules/notifications/notifications.module";
import type { EmailContext } from "../../../src/modules/notifications/templates/templates";
import { renderEmail } from "../../../src/modules/notifications/templates/templates";

const context: EmailContext = { publicUrl: "https://console.example.test", nearNetwork: NearNetwork.MAINNET };

const dapp = makeDapp();

/**
 * Builds the SES emailer through the notifications module, configured for the Mainnet context above.
 * @param email The SES config.
 * @returns The emailer.
 */
async function createEmailer(email = SES_EMAIL): Promise<Emailer> {
    const config = {
        ...TEST_CONFIG,
        email,
        server: { ...TEST_CONFIG.server, publicUrl: context.publicUrl },
        auth0: { ...TEST_CONFIG.auth0, nearNetwork: context.nearNetwork },
    };

    const module = await createTestingModuleWithConfig(config, NotificationsModule).compile();
    return module.get<Emailer>(EMAILER);
}

describe("SesEmailer", () => {
    let send: jest.SpyInstance;

    beforeEach(() => {
        send = jest.spyOn(SESv2Client.prototype, "send").mockImplementation(async () => ({}));
    });

    afterEach(() => jest.restoreAllMocks());

    describe("send", () => {
        it("should send the rendered email from the configured address and region", async () => {
            const timeout = jest.spyOn(AbortSignal, "timeout");
            const email = { template: EmailTemplate.DAPP_APPROVED, to: "owner@acme.example", dapp, clientId: CLIENT_ID } as const;
            const emailer = await createEmailer();
            await emailer.send(email);

            const { subject, html, text } = renderEmail(email, context);
            const command = send.mock.calls[0][0] as SendEmailCommand;
            expect(command).toBeInstanceOf(SendEmailCommand);
            expect(command.input).toEqual({
                FromEmailAddress: "no-reply@auth.example.test",
                Destination: { ToAddresses: ["owner@acme.example"] },
                Content: {
                    Simple: {
                        Subject: { Data: subject, Charset: "UTF-8" },
                        Body: { Html: { Data: html, Charset: "UTF-8" }, Text: { Data: text, Charset: "UTF-8" } },
                    },
                },
            });
            expect(timeout).toHaveBeenCalledWith(10_000);
            expect(send.mock.calls[0][1]).toEqual({ abortSignal: timeout.mock.results[0]?.value });
            const { config } = send.mock.contexts[0] as SESv2Client;
            await expect(config.region()).resolves.toBe("eu-west-1");
        });

        it("should send an admin alert to every admin", async () => {
            const emailer = await createEmailer();
            await emailer.send({
                template: EmailTemplate.ADMIN_ALERT,
                to: ["a@example.test", "b@example.test"],
                dapp,
                kind: DappEventType.SUBMITTED,
            });
            expect((send.mock.calls[0][0] as SendEmailCommand).input.Destination).toEqual({
                ToAddresses: ["a@example.test", "b@example.test"],
            });
        });

        it("should reject when SES refuses the email", async () => {
            send.mockRejectedValue(new Error("MessageRejected"));
            const emailer = await createEmailer();
            await expect(emailer.send({ template: EmailTemplate.CHANGED_BY_ADMIN, to: "owner@acme.example", dapp })).rejects.toThrow(
                "MessageRejected",
            );
        });
    });
});

describe("SesEmailer against an SES endpoint that answers 503", () => {
    const requests: string[] = [];
    let server: Server;

    beforeAll(async () => {
        server = createServer((request, response) => {
            request.resume();
            requests.push(`${request.method} ${request.url}`);
            response.statusCode = 503;
            response.setHeader("Content-Type", "application/json");
            response.end('{"message":"Service Unavailable"}');
        });
        await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
        const { port } = server.address() as AddressInfo;
        jest.replaceProperty(process, "env", {
            ...process.env,
            AWS_ENDPOINT_URL_SESV2: `http://127.0.0.1:${port}`,
            AWS_ACCESS_KEY_ID: "test",
            AWS_SECRET_ACCESS_KEY: "test",
        });
    });

    afterAll(async () => {
        jest.restoreAllMocks();
        await new Promise((resolve) => server.close(resolve));
    });

    beforeEach(() => {
        requests.length = 0;
    });

    describe("send", () => {
        it("should retry the send once, then reject", async () => {
            const emailer = await createEmailer();
            await expect(emailer.send({ template: EmailTemplate.CHANGED_BY_ADMIN, to: "owner@acme.example", dapp })).rejects.toThrow();

            expect(requests).toEqual(["POST /v2/email/outbound-emails", "POST /v2/email/outbound-emails"]);
        });

        it("should send 3 times when 3 attempts are configured, then reject", async () => {
            const emailer = await createEmailer({ ...SES_EMAIL, maxAttempts: 3 });
            await expect(emailer.send({ template: EmailTemplate.CHANGED_BY_ADMIN, to: "owner@acme.example", dapp })).rejects.toThrow();

            expect(requests).toEqual([
                "POST /v2/email/outbound-emails",
                "POST /v2/email/outbound-emails",
                "POST /v2/email/outbound-emails",
            ]);
        });
    });
});
