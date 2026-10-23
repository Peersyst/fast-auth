import spec from "../../../../openapi-spec.json";
import { DappEventType } from "../../../domain/dapp-event";

type Schema = { $ref?: string; enum?: string[]; items?: Schema; oneOf?: Schema[]; properties?: Record<string, Schema> };
type Operation = { operationId?: string; responses: Record<string, { content?: Record<string, { schema: Schema }> }> };

const operations = Object.values(spec.paths as Record<string, Record<string, Operation>>).flatMap((path) => Object.values(path));
const schemas = spec.components.schemas as Record<string, Schema>;

describe("the published events response", () => {
    it("names every event type in exactly one schema", () => {
        const listEvents = operations.find((operation) => operation.operationId === "AdminController_listEvents");
        const members = listEvents?.responses["200"]?.content?.["application/json"]?.schema.items?.oneOf ?? [];
        const types = members.flatMap((member) => schemas[member.$ref?.split("/").pop() ?? ""]?.properties?.type?.enum ?? []);

        expect(types.sort()).toEqual(Object.values(DappEventType).sort());
    });
});
