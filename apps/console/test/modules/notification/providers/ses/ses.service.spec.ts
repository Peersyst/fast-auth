import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { EmailTemplate } from "@shared/modules/dapp";
import { NearNetwork } from "../../../../../src/config/auth0.config";
import { SesService } from "../../../../../src/modules/notification/providers/ses/ses.service";
import { DappMock } from "../../../../mocks/dapp/dapp.mock";

describe("SesService", () => {
    const emailer = new SesService(
        {
            publicUrl: "https://console.example.test",
            nearNetwork: NearNetwork.TESTNET,
            guideUrl: "https://docs.auth.near.org/home/guides/authenticate-users",
        },
        { from: "no-reply@auth.example.test", region: "eu-west-1", timeoutMs: 10000, maxAttempts: 2 },
    );
    let send: jest.SpyInstance;

    beforeEach(() => {
        send = jest.spyOn(SESv2Client.prototype, "send").mockImplementation(async () => ({}));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should send the rendered email from the configured sender to every recipient, with a timeout signal", async () => {
        await emailer.send({ template: EmailTemplate.CHANGE_APPROVED, to: "owner@acme.example", dapp: new DappMock() });

        const [command, options] = send.mock.calls[0] as [SendEmailCommand, { abortSignal: AbortSignal }];
        expect(command.input).toMatchObject({
            FromEmailAddress: "no-reply@auth.example.test",
            Destination: { ToAddresses: ["owner@acme.example"] },
            Content: { Simple: { Subject: { Data: "Your dApp change is approved", Charset: "UTF-8" } } },
        });
        expect(command.input.Content?.Simple?.Body?.Text?.Data).toContain(
            "The change you requested for Acme & Co is approved and now live.",
        );
        expect(options.abortSignal).toBeInstanceOf(AbortSignal);
    });

    it("should address an admin alert to every admin in one email", async () => {
        await emailer.send({
            template: EmailTemplate.ADMIN_ALERT,
            to: ["a@example.test", "b@example.test"],
            dapp: new DappMock(),
            kind: "submitted",
        });

        expect((send.mock.calls[0][0] as SendEmailCommand).input.Destination).toEqual({
            ToAddresses: ["a@example.test", "b@example.test"],
        });
    });

    it("should let a failed send throw", async () => {
        send.mockRejectedValueOnce(new Error("Throttling"));

        await expect(
            emailer.send({ template: EmailTemplate.CHANGE_APPROVED, to: "owner@acme.example", dapp: new DappMock() }),
        ).rejects.toThrow("Throttling");
    });
});
