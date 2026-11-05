import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { DappEventType, MauBracket } from "@shared/modules/dapp";
import { slackMessage, SlackService } from "../../../../../src/modules/notification/providers/slack/slack.service";
import { DappMock } from "../../../../mocks/dapp/dapp.mock";

const PUBLIC_URL = "https://console.example.test";

describe("SlackService", () => {
    const dapp = new DappMock({ logoutUrls: [], callbackUrls: ["https://acme.example/callback", "https://acme.example/silent"] });

    describe("slackMessage", () => {
        it("should list every field after the summary and the review link, with a dash for an empty list, and never unfurl", () => {
            expect(slackMessage({ kind: DappEventType.SUBMITTED, dapp }, PUBLIC_URL)).toEqual({
                text: [
                    "*New dApp submission to review*",
                    "Acme &amp; Co was submitted and is waiting for review.",
                    `<${PUBLIC_URL}/admin/dapps/${dapp.id}|Review it in the console>`,
                    "*Name:* Acme &amp; Co",
                    "*Description:* A wallet",
                    "*Logo:* https://acme.example/logo.png",
                    "*Expected MAU:* Less than 1,000",
                    "*Callback URLs:* https://acme.example/callback, https://acme.example/silent",
                    "*Logout URLs:* —",
                    "*Web origins:* https://acme.example",
                    "*Contact:* dev@acme.example",
                ].join("\n"),
                unfurl_links: false,
                unfurl_media: false,
            });
        });

        it("should keep a description with line breaks on one line, so it cannot fake another field", () => {
            const { text } = slackMessage(
                { kind: DappEventType.SUBMITTED, dapp: new DappMock({ description: "Fine\n*Contact:* <!channel>" }) },
                PUBLIC_URL,
            );

            expect(text).toContain("*Description:* Fine *Contact:* &lt;!channel&gt;\n");
        });

        it("should give a resubmission's rejection reason and mark each changed field with its old value", () => {
            const rejected = { ...dapp, name: "Old Acme", mauBracket: MauBracket.GT_25K };

            const { text } = slackMessage(
                { kind: DappEventType.RESUBMITTED, dapp, rejected, rejectionReason: "Logo is broken." },
                PUBLIC_URL,
            );

            expect(text).toContain("*Rejected because:* Logo is broken.\n*Name (changed):* Acme &amp; Co (was: Old Acme)\n");
            expect(text).toContain("*Expected MAU (changed):* Less than 1,000 (was: More than 25,000)");
        });

        it("should say when a resubmission changed nothing", () => {
            const { text } = slackMessage(
                { kind: DappEventType.RESUBMITTED, dapp, rejected: { ...dapp }, rejectionReason: "Broken." },
                PUBLIC_URL,
            );

            expect(text).toContain("*Rejected because:* Broken.\nNothing was changed since the rejection.\n");
        });
    });

    describe("notify", () => {
        let server: Server;
        let origin: string;
        const received: { method?: string; url?: string; contentType?: string; body: string }[] = [];

        beforeAll(async () => {
            server = createServer((request, response) => {
                let body = "";
                request.on("data", (chunk) => (body += chunk));
                request.on("end", () => {
                    received.push({ method: request.method, url: request.url, contentType: request.headers["content-type"], body });
                    if (request.url === "/ok") response.end("ok");
                    if (request.url === "/missing") response.writeHead(404).end("no_service");
                });
            });
            await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
            origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        });

        beforeEach(() => {
            received.length = 0;
        });

        afterAll(async () => {
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
        });

        it("should post the message as JSON to the webhook", async () => {
            await new SlackService(`${origin}/ok`, PUBLIC_URL, 5000).notify({ kind: DappEventType.AUTO_APPROVED, dapp });

            expect(received).toEqual([
                {
                    method: "POST",
                    url: "/ok",
                    contentType: "application/json",
                    body: JSON.stringify(slackMessage({ kind: DappEventType.AUTO_APPROVED, dapp }, PUBLIC_URL)),
                },
            ]);
        });

        it("should throw on an error answer, naming the status in the error code", async () => {
            await expect(
                new SlackService(`${origin}/missing`, PUBLIC_URL, 5000).notify({ kind: DappEventType.SUBMITTED, dapp }),
            ).rejects.toMatchObject({ message: "Slack webhook answered 404", code: "HTTP_404" });
        });

        it("should give up once the deadline passes", async () => {
            await expect(
                new SlackService(`${origin}/hang`, PUBLIC_URL, 50).notify({ kind: DappEventType.SUBMITTED, dapp }),
            ).rejects.toMatchObject({ name: "TimeoutError" });
        });
    });
});
