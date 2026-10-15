import { register } from "prom-client";
import { dappForm, expectError, useConsoleApi } from "./utils/console-api";

describe("metrics", () => {
    const api = useConsoleApi();

    it("counts a submission and a duplicate, and gauges the pending dApp", async () => {
        const owner = await api.user();
        await api.submitDapp(owner);
        expectError(await api.submit(owner, dappForm()), 409, "DAPP_ALREADY_EXISTS");

        const lines = (await register.metrics()).split("\n");

        expect(lines).toContain('console_transitions_total{action="submit",result="success"} 1');
        expect(lines).toContain('console_transitions_total{action="submit",result="DAPP_ALREADY_EXISTS"} 1');
        expect(lines).toContain('console_emails_total{template="admin_alert",result="sent"} 1');
        expect(lines).toContain('console_dapps{status="pending"} 1');
    });
});
