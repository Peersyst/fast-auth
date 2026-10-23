import type { AnonymisableDapp, AnonymisableEvent } from "./anonymisation";
import { anonymise } from "./anonymisation";

const dapp: AnonymisableDapp = {
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

const events: AnonymisableEvent[] = [
    { id: "e1", actorEmail: "alice@example.com", details: { chosenForAutoApproval: false } },
    { id: "e2", actorEmail: "admin@console.test", details: {} },
    { id: "e3", actorEmail: null, details: { template: "changed_by_admin", error: "Address not verified: bob@example.org" } },
    { id: "e4", actorEmail: null, details: { changes: [{ field: "name", before: "Acme", after: "Acme Wallet" }] } },
];

describe("anonymise", () => {
    it("erases every identity column and actor email, and every email address in reasons and event details", () => {
        const result = anonymise(dapp, events);

        expect(result).toEqual({
            dapp: {
                ownerEmail: "erased",
                contactEmail: "erased",
                reviewedBy: "erased",
                removedBy: "erased",
                removalReason: "Requested by erased by email.",
            },
            events: [
                { id: "e1", changes: { actorEmail: "erased" } },
                { id: "e2", changes: { actorEmail: "erased" } },
                { id: "e3", changes: { details: { template: "changed_by_admin", error: "Address not verified: erased" } } },
            ],
            erasedColumns: ["ownerEmail", "contactEmail", "reviewedBy", "removedBy"],
            scrubbedColumns: ["removalReason"],
            erasedActors: 2,
            scrubbedDetails: 1,
        });
    });

    it("changes nothing on a second run", () => {
        const first = anonymise(dapp, events);
        const anonymised = { ...dapp, ...first.dapp };
        const anonymisedEvents = events.map((event) => ({ ...event, ...first.events.find(({ id }) => id === event.id)?.changes }));

        expect(anonymise(anonymised, anonymisedEvents)).toEqual({
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
        ['{"to":"bob@example.org"}', '{"to":"erased"}'],
        ["a@b@example.org asked", "erased asked"],
        ["Contact us @acme or at acme@", "Contact us @acme or at acme@"],
        ["Requested by jean.o'neil@example.com", "Requested by erased"],
        ["'bob@example.org'", "'erased'"],
    ])("replaces every email address in %j", (reason, scrubbed) => {
        expect(anonymise({ ...dapp, rejectionReason: reason }, []).dapp.rejectionReason ?? reason).toBe(scrubbed);
    });

    it("erases an email address typed into the name or description", () => {
        const result = anonymise({ ...dapp, name: "Acme by bob@example.org", description: "Write to bob@example.org for access." }, []);

        expect(result.dapp).toMatchObject({ name: "Acme by erased", description: "Write to erased for access." });
        expect(result.scrubbedColumns).toEqual(["name", "description", "removalReason"]);
    });

    it("erases an address whose local part has an apostrophe from event details", () => {
        const result = anonymise(dapp, [
            { id: "e1", actorEmail: null, details: { error: "Email address is not verified: jean.o'neil@example.com" } },
        ]);

        expect(result.events).toEqual([{ id: "e1", changes: { details: { error: "Email address is not verified: erased" } } }]);
    });

    it("leaves null columns and text without email addresses untouched", () => {
        const system = { ...dapp, reviewedBy: null, removalReason: null, auth0Error: "Auth0 update answered 400: bad callback" };

        const result = anonymise(system, [{ id: "e1", actorEmail: null, details: { reason: "Not a wallet." } }]);

        expect(result).toEqual({
            dapp: { ownerEmail: "erased", contactEmail: "erased", removedBy: "erased" },
            events: [],
            erasedColumns: ["ownerEmail", "contactEmail", "removedBy"],
            scrubbedColumns: [],
            erasedActors: 0,
            scrubbedDetails: 0,
        });
    });
});
