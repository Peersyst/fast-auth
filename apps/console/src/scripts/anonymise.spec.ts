import { parseDappId } from "./anonymise";

const ID = "6b1f1a2c-6c55-4a7e-9a55-2d4c34d58a12";

describe("parseDappId", () => {
    it("takes a single uuid", () => {
        expect(parseDappId([ID])).toBe(ID);
    });

    it.each([[[]], [["--help"]], [["not-a-uuid"]], [[ID, "1d1f1a2c-6c55-4a7e-9a55-2d4c34d58a12"]], [[ID, "--dry-run"]]])(
        "refuses %j",
        (args) => {
            expect(parseDappId(args)).toBeNull();
        },
    );
});
