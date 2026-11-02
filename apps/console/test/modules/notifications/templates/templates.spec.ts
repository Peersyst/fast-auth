import { CLIENT_ID, makeDapp } from "../../../utils/dapp";
import { NearNetwork } from "../../../../src/config/console-config";
import type { Dapp, DappId } from "@shared/console-domain/dapp";
import { DappEventType, EmailTemplate } from "@shared/console-domain/dapp-event";
import type { ConsoleEmail } from "../../../../src/modules/notifications/emailer";
import { renderLayout } from "../../../../src/modules/notifications/templates/layout";
import { renderEmail } from "../../../../src/modules/notifications/templates/templates";
import type { EmailContext } from "../../../../src/modules/notifications/templates/templates";

const context: EmailContext = { publicUrl: "https://console.example.test", nearNetwork: NearNetwork.TESTNET };

/**
 * Builds one email per template, and one admin alert per kind, all for the same dApp.
 * @param dapp The dApp.
 * @param reason The reason the rejection and removal emails quote.
 * @returns The emails.
 */
const everyEmail = (dapp: Dapp, reason = "Logo does not load."): ConsoleEmail[] => [
    { template: EmailTemplate.DAPP_APPROVED, to: "owner@acme.example", dapp, clientId: CLIENT_ID },
    { template: EmailTemplate.DAPP_REJECTED, to: "owner@acme.example", dapp, reason },
    { template: EmailTemplate.CHANGE_APPROVED, to: "owner@acme.example", dapp },
    { template: EmailTemplate.CHANGE_REJECTED, to: "owner@acme.example", dapp, reason },
    { template: EmailTemplate.CHANGED_BY_ADMIN, to: "owner@acme.example", dapp },
    { template: EmailTemplate.REMOVED_BY_ADMIN, to: "owner@acme.example", dapp, reason },
    { template: EmailTemplate.ADMIN_ALERT, to: ["admin@example.test"], dapp, kind: DappEventType.SUBMITTED },
    { template: EmailTemplate.ADMIN_ALERT, to: ["admin@example.test"], dapp, kind: DappEventType.AUTO_APPROVED },
    { template: EmailTemplate.ADMIN_ALERT, to: ["admin@example.test"], dapp, kind: DappEventType.RESUBMITTED },
    { template: EmailTemplate.ADMIN_ALERT, to: ["admin@example.test"], dapp, kind: DappEventType.CHANGE_REQUESTED },
];

/**
 * Names an email for test titles and snapshot keys.
 * @param email The email.
 * @returns The template, plus the kind for an admin alert.
 */
const label = (email: ConsoleEmail): string =>
    email.template === EmailTemplate.ADMIN_ALERT ? `admin_alert/${email.kind}` : email.template;

describe("email templates", () => {
    it.each(everyEmail(makeDapp()).map((email) => [label(email), email] as const))(
        "should render the subject and text of %s",
        (_, email) => {
            const { subject, text } = renderEmail(email, context);
            expect({ subject, text }).toMatchSnapshot();
        },
    );

    it("should lay out every block type", () => {
        const { html } = renderLayout("Subject", "Heading", [
            { type: "paragraph", text: "A paragraph." },
            { type: "quote", text: "First line\nSecond line" },
            { type: "code", text: "const a = 1;" },
            { type: "link", label: "Open it", href: "https://console.example.test/" },
        ]);
        expect(html).toMatchSnapshot();
    });

    it.each(everyEmail(makeDapp({ name: "Zyx Unique Name" })).map((email) => [label(email), email] as const))(
        "should keep the dApp name out of the %s subject and in its body",
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
    )("should escape every interpolated field in %s", (_, email) => {
        const { html, text } = renderEmail(email, context);
        expect(html).not.toMatch(/<img|<script/);
        expect(html).toContain("Acme &amp; &lt;img src=x onerror=&quot;alert(&#39;n&#39;)&quot;&gt;");
        if ("reason" in email) expect(html).toContain("&lt;/p&gt;&lt;script&gt;alert(&quot;r&quot;)&lt;/script&gt;");
        expect(text).toContain(`Acme & <img src=x onerror="alert('n')">`);
    });

    it("should escape the owner email and the dApp id in admin alerts", () => {
        const dapp = makeDapp({ ownerEmail: `"a<b>"@acme.example`, id: `x"><b>` as DappId });
        const { html } = renderEmail(
            { template: EmailTemplate.ADMIN_ALERT, to: ["admin@example.test"], dapp, kind: DappEventType.SUBMITTED },
            context,
        );
        expect(html).toContain("&quot;a&lt;b&gt;&quot;@acme.example");
        expect(html).toContain('href="https://console.example.test/admin/dapps/x%22%3E%3Cb%3E"');
    });

    it.each([NearNetwork.TESTNET, NearNetwork.MAINNET])(
        "should give the client id and a %s provider snippet in the approval email",
        (nearNetwork) => {
            const { html, text } = renderEmail(
                { template: EmailTemplate.DAPP_APPROVED, to: "owner@acme.example", dapp: makeDapp(), clientId: CLIENT_ID },
                { ...context, nearNetwork },
            );
            expect(text).toContain(`network: "${nearNetwork}",`);
            expect(text).toContain('clientId: "abcDEF123",');
            expect(text).toContain("https://docs.auth.near.org/home/guides/authenticate-users");
            expect(html).toContain(`network: &quot;${nearNetwork}&quot;,`);
            expect(text).not.toMatch(/domain:|signingAudience:/);
        },
    );

    it("should link to the console from the public URL, and otherwise only to the NEAR Auth docs", () => {
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
