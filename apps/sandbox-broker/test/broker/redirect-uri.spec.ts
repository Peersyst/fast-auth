import { redirectOrigin } from "../../src/modules/broker/redirect-uri";

describe("redirectOrigin", () => {
    it.each([
        ["https://my-dapp.vercel.app", "https://my-dapp.vercel.app"],
        ["https://my-dapp.example/callback?tab=1", "https://my-dapp.example"],
        ["https://my-dapp.example:8443/", "https://my-dapp.example:8443"],
        ["http://localhost:5173/callback", "http://localhost:5173"],
        ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
    ])("should accept %s", (value, origin) => {
        expect(redirectOrigin(value)).toBe(origin);
    });

    it.each([
        ["plain http on a public host", "http://my-dapp.example/callback"],
        ["a fragment", "https://my-dapp.example/#/callback"],
        ["credentials", "https://user:pass@my-dapp.example"],
        ["another scheme", "javascript:alert(1)"],
        ["a native scheme", "com.example.app://callback"],
        ["a relative URL", "/callback"],
        ["an array", ["https://a.example", "https://b.example"]],
        ["nothing", undefined],
        ["a huge URL", `https://my-dapp.example/${"a".repeat(2100)}`],
    ])("should refuse %s", (_, value) => {
        expect(redirectOrigin(value)).toBeNull();
    });
});
