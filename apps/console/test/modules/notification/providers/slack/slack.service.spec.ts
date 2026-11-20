import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { MauBracket } from "@shared/modules/dapp";
import { Role } from "../../../../../src/modules/auth/types/session-user";
import { AdminAlertKind } from "../../../../../src/modules/notification/interfaces/i-slack-notifier.service";
import { slackMessage, SlackService } from "../../../../../src/modules/notification/providers/slack/slack.service";
import { DappMock } from "../../../../mocks/dapp/dapp.mock";

describe("SlackService", () => {
    const publicUrl = "https://console.example.test";
    const dapp = new DappMock({ logoutUrls: [], callbackUrls: ["https://acme.example/callback", "https://acme.example/silent"] });

    describe("slackMessage", () => {
        it("should list every field after the summary and the review link, with a dash for an empty list, and never unfurl", () => {
            expect(slackMessage({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp }, publicUrl)).toEqual({
                text: [
                    "*New dApp submission to review*",
                    "Acme &amp; Co was submitted and is waiting for review.",
                    `<${publicUrl}/admin/dapps/${dapp.id}|Review it in the console>`,
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
                { kind: AdminAlertKind.DAPP_SUBMITTED, dapp: new DappMock({ description: "Fine\n*Contact:* <!channel>" }) },
                publicUrl,
            );

            expect(text).toContain("*Description:* Fine *Contact:* &lt;!channel&gt;\n");
        });

        it("should mark each field a change request changes with the live value", () => {
            const { text } = slackMessage(
                { kind: AdminAlertKind.CHANGE_REQUESTED, dapp, change: { name: "New Acme", mauBracket: MauBracket.GT_25K } },
                publicUrl,
            );

            expect(text).toContain("*A dApp change request to review*\nAcme &amp; Co has a change request that is waiting for review.\n");
            expect(text).toContain("*Name (changed):* New Acme (was: Acme &amp; Co)\n");
            expect(text).toContain("*Expected MAU (changed):* More than 25,000 (was: Less than 1,000)\n");
            expect(text).toContain("*Contact:* dev@acme.example");
        });

        it("should tell the admins to delete the Auth0 client of a deleted dApp by hand, with no review link", () => {
            expect(
                slackMessage(
                    { kind: AdminAlertKind.DAPP_DELETED, dapp: new DappMock({ auth0ClientId: "client_live" }), deletedBy: Role.USER },
                    publicUrl,
                ),
            ).toEqual({
                text: [
                    "*A dApp was deleted*",
                    "Acme &amp; Co (`6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b`) was deleted by its owner.",
                    "Its Auth0 client `client_live` was kept. Delete it in Auth0 by hand.",
                ].join("\n"),
                unfurl_links: false,
                unfurl_media: false,
            });
        });

        it("should say a deleted dApp has no stored Auth0 client, and name an admin who deleted it", () => {
            const { text } = slackMessage({ kind: AdminAlertKind.DAPP_DELETED, dapp, deletedBy: Role.ADMIN }, publicUrl);

            expect(text).toBe(
                [
                    "*A dApp was deleted*",
                    "Acme &amp; Co (`6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b`) was deleted by an admin.",
                    "No Auth0 client is stored for it. If an approval was running, the console log names the client it created.",
                ].join("\n"),
            );
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
            await new SlackService(`${origin}/ok`, publicUrl, 5000).notify({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp });

            expect(received).toEqual([
                {
                    method: "POST",
                    url: "/ok",
                    contentType: "application/json",
                    body: JSON.stringify(slackMessage({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp }, publicUrl)),
                },
            ]);
        });

        it("should throw on an error answer, naming the status in the error code", async () => {
            await expect(
                new SlackService(`${origin}/missing`, publicUrl, 5000).notify({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp }),
            ).rejects.toMatchObject({ message: "Slack webhook answered 404", code: "HTTP_404" });
        });

        it("should give up once the deadline passes", async () => {
            await expect(
                new SlackService(`${origin}/hang`, publicUrl, 50).notify({ kind: AdminAlertKind.DAPP_SUBMITTED, dapp }),
            ).rejects.toMatchObject({ name: "TimeoutError" });
        });
    });
});
