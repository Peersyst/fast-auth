import { makeDapp } from "../../../test/utils/dapp";
import { slackMessage, SlackWebhookNotifier } from "./slack-webhook.notifier";

const WEBHOOK_URL = "https://hooks.slack.com/services/T000/B000/token";
const PUBLIC_URL = "https://console.example.test";

const dapp = makeDapp({
    name: "Acme & Co",
    description: "A wallet for the Acme community.",
    mauBracket: "1k_10k",
    callbackUrls: ["https://acme.example/callback", "https://staging.acme.example/callback"],
    contactEmail: "team@acme.example",
});

describe("slackMessage", () => {
    it("says an auto-approved dApp got an Auth0 client, links the admin page and leaves out the owner's email", () => {
        const { text } = slackMessage({ kind: "auto_approved", dapp }, PUBLIC_URL);

        expect(text.startsWith("*A dApp was auto-approved*\nAcme &amp; Co was approved automatically and got an Auth0 client.\n")).toBe(
            true,
        );
        expect(text).toContain(`\n<${PUBLIC_URL}/admin/dapps/${dapp.id}|Review it in the console>\n`);
        expect(text).not.toContain(dapp.ownerEmail);
    });

    it("never unfurls links or media, so a submitted logo URL cannot show an image in the channel", () => {
        const message = slackMessage({ kind: "submitted", dapp }, PUBLIC_URL);

        expect(message.unfurl_links).toBe(false);
        expect(message.unfurl_media).toBe(false);
    });

    it("lists every submitted field after the summary and the link, with a dash for an empty list", () => {
        expect(slackMessage({ kind: "submitted", dapp }, PUBLIC_URL).text).toBe(
            [
                "*New dApp submission to review*",
                "Acme &amp; Co was submitted and is waiting for review.",
                `<${PUBLIC_URL}/admin/dapps/${dapp.id}|Review it in the console>`,
                "*Name:* Acme &amp; Co",
                "*Description:* A wallet for the Acme community.",
                "*Logo:* https://acme.example/logo.png",
                "*Expected MAU:* 1,000 – 10,000",
                "*Callback URLs:* https://acme.example/callback, https://staging.acme.example/callback",
                "*Logout URLs:* —",
                "*Web origins:* https://acme.example",
                "*Contact:* team@acme.example",
            ].join("\n"),
        );
    });

    it("escapes every submitted text, and shows a dash for an empty description", () => {
        const { text } = slackMessage(
            { kind: "submitted", dapp: { ...dapp, description: "", contactEmail: "<!here>@acme.example" } },
            PUBLIC_URL,
        );

        expect(text).toContain("*Description:* —");
        expect(text).toContain("*Contact:* &lt;!here&gt;@acme.example");
        expect(text).not.toContain("<!here>");
    });

    it("keeps a description with line breaks on its own line, so it cannot fake another field", () => {
        const { text } = slackMessage(
            { kind: "submitted", dapp: { ...dapp, description: "Nice app\n*Contact:* attacker@evil.example" } },
            PUBLIC_URL,
        );

        expect(text).toContain("*Description:* Nice app *Contact:* attacker@evil.example\n");
        expect(text.match(/^\*Contact:\*/gm)).toHaveLength(1);
    });

    it("treats a line separator in a description as a space", () => {
        const { text } = slackMessage({ kind: "submitted", dapp: { ...dapp, description: "Nice app\u2028*Contact:* x" } }, PUBLIC_URL);

        expect(text).toContain("*Description:* Nice app *Contact:* x\n");
    });

    it("treats a next-line control character in the rejection reason as a space", () => {
        const { text } = slackMessage(
            { kind: "resubmitted", dapp, rejected: dapp, rejectionReason: "Fix the logo\u0085*Contact:* x" },
            PUBLIC_URL,
        );

        expect(text).toContain("*Rejected because:* Fix the logo *Contact:* x\n");
        expect(text.match(/^\*Contact:\*/gm)).toHaveLength(1);
    });

    it("gives a resubmission's rejection reason and marks each field changed since the rejection, with its old value", () => {
        const rejected = {
            ...dapp,
            description: "Old description",
            logoUrl: "https://old.example/logo.png",
            contactEmail: "old@acme.example",
        };
        const { text } = slackMessage(
            { kind: "resubmitted", dapp, rejected, rejectionReason: "Host the logo on <your> domain." },
            PUBLIC_URL,
        );

        expect(text).toBe(
            [
                "*A dApp was resubmitted for review*",
                "Acme &amp; Co was resubmitted after a rejection and is waiting for review again.",
                `<${PUBLIC_URL}/admin/dapps/${dapp.id}|Review it in the console>`,
                "*Rejected because:* Host the logo on &lt;your&gt; domain.",
                "*Name:* Acme &amp; Co",
                "*Description (changed):* A wallet for the Acme community. (was: Old description)",
                "*Logo (changed):* https://acme.example/logo.png (was: https://old.example/logo.png)",
                "*Expected MAU:* 1,000 – 10,000",
                "*Callback URLs:* https://acme.example/callback, https://staging.acme.example/callback",
                "*Logout URLs:* —",
                "*Web origins:* https://acme.example",
                "*Contact (changed):* team@acme.example (was: old@acme.example)",
            ].join("\n"),
        );
    });

    it("says when a resubmission changed nothing, and compares URL lists as sets", () => {
        const rejected = { ...dapp, callbackUrls: [...dapp.callbackUrls].reverse() };
        const { text } = slackMessage({ kind: "resubmitted", dapp, rejected, rejectionReason: "Add a logout URL." }, PUBLIC_URL);

        expect(text).toContain("*Rejected because:* Add a logout URL.\nNothing was changed since the rejection.\n*Name:*");
        expect(text).not.toContain("(changed)");
    });

    it("escapes the name, so it can neither mention the channel nor hide a link", () => {
        const { text } = slackMessage({ kind: "submitted", dapp: { ...dapp, name: "<!channel> <https://evil.example|Acme>" } }, PUBLIC_URL);

        expect(text).toContain("&lt;!channel&gt; &lt;https://evil.example|Acme&gt;");
        expect(text).not.toContain("<!channel>");
    });
});

describe("SlackWebhookNotifier", () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");

    afterEach(() => fetchMock.mockReset());
    afterAll(() => fetchMock.mockRestore());

    it("posts the message as JSON to the webhook", async () => {
        fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));

        await new SlackWebhookNotifier(WEBHOOK_URL, PUBLIC_URL).notify({ kind: "submitted", dapp });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] ?? [];
        expect(url).toBe(WEBHOOK_URL);
        expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
        expect(JSON.parse(init?.body as string)).toEqual(slackMessage({ kind: "submitted", dapp }, PUBLIC_URL));
    });

    it("aborts the post when the 5 s timeout signal fires", async () => {
        const controller = new AbortController();
        const timeout = jest.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
        fetchMock.mockImplementation(
            (_, init) =>
                new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
                }),
        );

        const notified = new SlackWebhookNotifier(WEBHOOK_URL, PUBLIC_URL).notify({ kind: "submitted", dapp });
        controller.abort();

        await expect(notified).rejects.toThrow("aborted");
        expect(timeout).toHaveBeenCalledWith(5_000);
        timeout.mockRestore();
    });

    it("releases the unread body of a successful answer", async () => {
        const response = new Response("ok", { status: 200 });
        const cancel = jest.spyOn(response.body as ReadableStream, "cancel");
        fetchMock.mockResolvedValue(response);

        await new SlackWebhookNotifier(WEBHOOK_URL, PUBLIC_URL).notify({ kind: "submitted", dapp });

        expect(cancel).toHaveBeenCalledTimes(1);
    });

    it("throws on a non-2xx answer, naming the status in the error code, and releases the unread body", async () => {
        const response = new Response("no_service", { status: 404 });
        const cancel = jest.spyOn(response.body as ReadableStream, "cancel");
        fetchMock.mockResolvedValue(response);

        await expect(new SlackWebhookNotifier(WEBHOOK_URL, PUBLIC_URL).notify({ kind: "submitted", dapp })).rejects.toMatchObject({
            code: "HTTP_404",
        });

        expect(cancel).toHaveBeenCalledTimes(1);
    });
});
