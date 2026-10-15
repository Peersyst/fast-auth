import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { CLIENT_ID, makeDapp } from "../../../test/utils/dapp";
import { SES_EMAIL } from "../../../test/utils/test-config";
import { SesEmailer } from "./ses.emailer";
import type { EmailContext } from "./templates/templates";
import { renderEmail } from "./templates/templates";

const context: EmailContext = { publicUrl: "https://console.example.test", nearNetwork: "mainnet" };

const dapp = makeDapp();

describe("SesEmailer", () => {
    let send: jest.SpyInstance;

    beforeEach(() => {
        send = jest.spyOn(SESv2Client.prototype, "send").mockImplementation(async () => ({}));
    });

    afterEach(() => jest.restoreAllMocks());

    it("sends the rendered email from the configured address and region", async () => {
        const timeout = jest.spyOn(AbortSignal, "timeout");
        const email = { template: "dapp_approved", to: "owner@acme.example", dapp, clientId: CLIENT_ID } as const;
        await new SesEmailer(context, SES_EMAIL).send(email);

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

    it("sends an admin alert to every admin", async () => {
        await new SesEmailer(context, SES_EMAIL).send({
            template: "admin_alert",
            to: ["a@example.test", "b@example.test"],
            dapp,
            kind: "submitted",
        });
        expect((send.mock.calls[0][0] as SendEmailCommand).input.Destination).toEqual({
            ToAddresses: ["a@example.test", "b@example.test"],
        });
    });

    it("rejects when SES refuses the email", async () => {
        send.mockRejectedValue(new Error("MessageRejected"));
        await expect(
            new SesEmailer(context, SES_EMAIL).send({ template: "changed_by_admin", to: "owner@acme.example", dapp }),
        ).rejects.toThrow("MessageRejected");
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

    it("retries the send once, then rejects", async () => {
        await expect(
            new SesEmailer(context, SES_EMAIL).send({ template: "changed_by_admin", to: "owner@acme.example", dapp }),
        ).rejects.toThrow();

        expect(requests).toEqual(["POST /v2/email/outbound-emails", "POST /v2/email/outbound-emails"]);
    });
});
