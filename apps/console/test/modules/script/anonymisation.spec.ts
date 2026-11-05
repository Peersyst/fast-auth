import { AnonymisableDapp, AnonymisableEvent, anonymise } from "../../../src/modules/script/anonymisation";

const DAPP: AnonymisableDapp = {
    name: "Acme",
    description: "A wallet.",
    ownerEmail: "Alice@Example.com",
    contactEmail: "team@acme.xyz",
    reviewedBy: "admin@console.test",
    removedBy: "alice@example.com",
    rejectionReason: null,
    removalReason: "Requested by ALICE@example.com by email.",
    auth0Error: null,
};

const EVENTS: AnonymisableEvent[] = [
    { id: "e1", actorEmail: "alice@example.com", details: { chosenForAutoApproval: false } },
    { id: "e2", actorEmail: null, details: { template: "changed_by_admin", error: "Address not verified: bob@example.org" } },
    { id: "e3", actorEmail: null, details: { changes: [{ field: "name", before: "Acme", after: "Acme Wallet" }] } },
];

describe("anonymise", () => {
    it("should erase every identity column and actor email, and every email address in reasons and event details", () => {
        expect(anonymise(DAPP, EVENTS)).toEqual({
            dapp: {
                ownerEmail: "erased",
                contactEmail: "erased",
                reviewedBy: "erased",
                removedBy: "erased",
                removalReason: "Requested by erased by email.",
            },
            events: [
                { id: "e1", changes: { actorEmail: "erased" } },
                { id: "e2", changes: { details: { template: "changed_by_admin", error: "Address not verified: erased" } } },
            ],
            erasedColumns: ["ownerEmail", "contactEmail", "reviewedBy", "removedBy"],
            scrubbedColumns: ["removalReason"],
            erasedActors: 1,
            scrubbedDetails: 1,
        });
    });

    it("should change nothing on a second run", () => {
        const first = anonymise(DAPP, EVENTS);
        const events = EVENTS.map((event) => ({ ...event, ...first.events.find(({ id }) => id === event.id)?.changes }));

        expect(anonymise({ ...DAPP, ...first.dapp }, events)).toEqual({
            dapp: {},
            events: [],
            erasedColumns: [],
            scrubbedColumns: [],
            erasedActors: 0,
            scrubbedDetails: 0,
        });
    });

    it.each([
        ["Rejected: <bob@example.org>.", "Rejected: <erased>."],
        ["bob@example.org, carol@example.org", "erased, erased"],
        ["Requested by jean.o'neil@example.com", "Requested by erased"],
        ["Contact us @acme or at acme@", "Contact us @acme or at acme@"],
        [
            "Logo at https://cdn.jsdelivr.net/npm/@acme/brand@1.0.0/logo.svg",
            "Logo at https://cdn.jsdelivr.net/npm/@acme/brand@1.0.0/logo.svg",
        ],
        ["Callback https://medium.com/@acme/callback", "Callback https://medium.com/@acme/callback"],
    ])("should replace every email address in %j and nothing else", (reason, scrubbed) => {
        expect(anonymise({ ...DAPP, rejectionReason: reason }, []).dapp.rejectionReason ?? reason).toBe(scrubbed);
    });

    it("should erase an email address typed into the name or description", () => {
        const result = anonymise({ ...DAPP, name: "Acme by bob@example.org", description: "Write to bob@example.org for access." }, []);

        expect(result.dapp).toMatchObject({ name: "Acme by erased", description: "Write to erased for access." });
        expect(result.scrubbedColumns).toEqual(["name", "description", "removalReason"]);
    });
});
