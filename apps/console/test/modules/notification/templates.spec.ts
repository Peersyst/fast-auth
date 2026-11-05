import { DappEventType, EmailTemplate } from "@shared/modules/dapp";
import { NearNetwork } from "../../../src/config/auth0.config";
import { EmailContext, renderEmail } from "../../../src/modules/notification/templates/templates";
import { ConsoleEmail } from "../../../src/modules/notification/interfaces/i-emailer.service";
import { DappMock } from "../../mocks/dapp/dapp.mock";

const context: EmailContext = {
    publicUrl: "https://console.example.test",
    nearNetwork: NearNetwork.TESTNET,
    guideUrl: "https://docs.auth.near.org/home/guides/authenticate-users",
};

describe("renderEmail", () => {
    it("should give the approval email's client id and a provider snippet for the network", () => {
        const email: ConsoleEmail = {
            template: EmailTemplate.DAPP_APPROVED,
            to: "owner@acme.example",
            dapp: new DappMock(),
            clientId: "abcDEF123",
        };

        const { subject, text } = renderEmail(email, { ...context, nearNetwork: NearNetwork.MAINNET });

        expect(subject).toBe("Your dApp is approved on NEAR Auth");
        expect(text).toContain('        network: "mainnet",\n        clientId: "abcDEF123",');
        expect(text).toContain("Read the authentication guide: https://docs.auth.near.org/home/guides/authenticate-users");
        expect(text).toContain("Open the NEAR Auth Console: https://console.example.test/");
    });

    it("should quote the reviewer's reason in the rejection email", () => {
        const { subject, text } = renderEmail(
            {
                template: EmailTemplate.DAPP_REJECTED,
                to: "owner@acme.example",
                dapp: new DappMock(),
                reason: "Logo does not load.\nFix it.",
            },
            context,
        );

        expect(subject).toBe("Your dApp needs changes before approval");
        expect(text).toContain(
            "Acme & Co needs changes before it can be approved. The reviewer wrote:\n\n> Logo does not load.\n> Fix it.",
        );
    });

    it.each([
        [DappEventType.SUBMITTED, "New dApp submission to review", "was submitted and is waiting for review."],
        [DappEventType.AUTO_APPROVED, "A dApp was auto-approved", "was approved automatically and got an Auth0 client."],
        [
            DappEventType.RESUBMITTED,
            "A dApp was resubmitted for review",
            "was resubmitted after a rejection and is waiting for review again.",
        ],
        [DappEventType.CHANGE_REQUESTED, "A dApp change request to review", "has a change request that is waiting for review."],
    ] as const)("should alert the admins about %s with the owner and the review link", (kind, subject, body) => {
        const dapp = new DappMock();
        const email = renderEmail({ template: EmailTemplate.ADMIN_ALERT, to: ["admin@example.test"], dapp, kind }, context);

        expect(email.subject).toBe(subject);
        expect(email.text).toContain(`Acme & Co (owner owner@acme.example) ${body}`);
        expect(email.text).toContain(`Review it in the console: https://console.example.test/admin/dapps/${dapp.id}`);
    });

    it("should escape every interpolated field in the HTML and keep it raw in the text", () => {
        const dapp = new DappMock({ name: `Acme <img src=x onerror="alert('n')">` });

        const { html, text } = renderEmail(
            { template: EmailTemplate.REMOVED_BY_ADMIN, to: "owner@acme.example", dapp, reason: "</p><script>x</script>" },
            context,
        );

        expect(html).not.toMatch(/<img|<script/);
        expect(html).toContain("Acme &lt;img src=x onerror=&quot;alert(&#39;n&#39;)&quot;&gt;");
        expect(html).toContain("&lt;/p&gt;&lt;script&gt;x&lt;/script&gt;");
        expect(text).toContain(`Acme <img src=x onerror="alert('n')">`);
    });
});
