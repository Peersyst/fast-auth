import { CLIENT_ID, makeDapp } from "../../../../test/utils/dapp";
import type { Dapp, DappId } from "../../../domain/dapp";
import type { ConsoleEmail } from "../emailer";
import { renderLayout } from "./layout";
import { renderEmail } from "./templates";
import type { EmailContext } from "./templates";

const context: EmailContext = { publicUrl: "https://console.example.test", nearNetwork: "testnet" };

const everyEmail = (dapp: Dapp, reason = "Logo does not load."): ConsoleEmail[] => [
    { template: "dapp_approved", to: "owner@acme.example", dapp, clientId: CLIENT_ID },
    { template: "dapp_rejected", to: "owner@acme.example", dapp, reason },
    { template: "change_approved", to: "owner@acme.example", dapp },
    { template: "change_rejected", to: "owner@acme.example", dapp, reason },
    { template: "changed_by_admin", to: "owner@acme.example", dapp },
    { template: "removed_by_admin", to: "owner@acme.example", dapp, reason },
    { template: "admin_alert", to: ["admin@example.test"], dapp, kind: "submitted" },
    { template: "admin_alert", to: ["admin@example.test"], dapp, kind: "auto_approved" },
    { template: "admin_alert", to: ["admin@example.test"], dapp, kind: "resubmitted" },
    { template: "admin_alert", to: ["admin@example.test"], dapp, kind: "change_requested" },
];

const label = (email: ConsoleEmail): string => (email.template === "admin_alert" ? `admin_alert/${email.kind}` : email.template);

describe("email templates", () => {
    it.each(everyEmail(makeDapp()).map((email) => [label(email), email] as const))("renders the subject and text of %s", (_, email) => {
        const { subject, text } = renderEmail(email, context);
        expect({ subject, text }).toMatchSnapshot();
    });

    it("lays out every block type", () => {
        const { html } = renderLayout("Subject", "Heading", [
            { type: "paragraph", text: "A paragraph." },
            { type: "quote", text: "First line\nSecond line" },
            { type: "code", text: "const a = 1;" },
            { type: "link", label: "Open it", href: "https://console.example.test/" },
        ]);
        expect(html).toMatchSnapshot();
    });

    it.each(everyEmail(makeDapp({ name: "Zyx Unique Name" })).map((email) => [label(email), email] as const))(
        "keeps the dApp name out of the %s subject and in its body",
        (_, email) => {
            const { subject, html, text } = renderEmail(email, context);
            expect(subject).not.toContain("Zyx");
            expect(html).toContain("Zyx Unique Name");
            expect(text).toContain("Zyx Unique Name");
        },
    );

    it.each(
        everyEmail(makeDapp({ name: `Acme & <img src=x onerror="alert('n')">` }), `</p><script>alert("r")</script>`).map(
            (email) => [label(email), email] as const,
        ),
    )("escapes every interpolated field in %s", (_, email) => {
        const { html, text } = renderEmail(email, context);
        expect(html).not.toMatch(/<img|<script/);
        expect(html).toContain("Acme &amp; &lt;img src=x onerror=&quot;alert(&#39;n&#39;)&quot;&gt;");
        if ("reason" in email) expect(html).toContain("&lt;/p&gt;&lt;script&gt;alert(&quot;r&quot;)&lt;/script&gt;");
        expect(text).toContain(`Acme & <img src=x onerror="alert('n')">`);
    });

    it("escapes the owner email and the dApp id in admin alerts", () => {
        const dapp = makeDapp({ ownerEmail: `"a<b>"@acme.example`, id: `x"><b>` as DappId });
        const { html } = renderEmail({ template: "admin_alert", to: ["admin@example.test"], dapp, kind: "submitted" }, context);
        expect(html).toContain("&quot;a&lt;b&gt;&quot;@acme.example");
        expect(html).toContain('href="https://console.example.test/admin/dapps/x%22%3E%3Cb%3E"');
    });

    it.each(["testnet", "mainnet"] as const)("gives the client id and a %s provider snippet in the approval email", (nearNetwork) => {
        const { html, text } = renderEmail(
            { template: "dapp_approved", to: "owner@acme.example", dapp: makeDapp(), clientId: CLIENT_ID },
            { ...context, nearNetwork },
        );
        expect(text).toContain(`network: "${nearNetwork}",`);
        expect(text).toContain('clientId: "abcDEF123",');
        expect(text).toContain("https://docs.auth.near.org/home/guides/authenticate-users");
        expect(html).toContain(`network: &quot;${nearNetwork}&quot;,`);
        expect(text).not.toMatch(/domain:|signingAudience:/);
    });

    it("links to the console from the public URL, and otherwise only to the NEAR Auth docs", () => {
        const dapp = makeDapp();
        for (const email of everyEmail(dapp)) {
            const { html } = renderEmail(email, context);
            const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1] ?? "");
            expect(hrefs.some((href) => href.startsWith("https://console.example.test/"))).toBe(true);
            for (const href of hrefs) {
                expect(href.startsWith("https://console.example.test/") || href.startsWith("https://docs.auth.near.org/")).toBe(true);
            }
        }
    });
});
