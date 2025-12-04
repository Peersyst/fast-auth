import * as fs from "node:fs";
import { FirebaseUser, IFirebaseDatabase } from "./IFirebaseDatabase";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";

export class LocalFirebaseDatabase implements IFirebaseDatabase {
    constructor(private readonly exportFile: string) {}

    /**
     *
     * @param _
     */
    async findById(_: string): Promise<FirebaseUser> {
        throw new Error("Method not implemented.");
    }

    /**
     *
     * @param callback
     */
    async iterateAll(callback: (user: FirebaseUser) => Promise<void>): Promise<void> {
        const pipeline = chain([
            fs.createReadStream(this.exportFile),
            parser(), // parse the JSON tokens
            pick({ filter: "users" }), // go inside the "users" property
            streamArray(), // iterate over the array items
        ]);

        try {
            for await (const chunk of pipeline as AsyncIterable<{
                key: number;
                value: FirebaseUser;
            }>) {
                const user = chunk.value;
                await callback(user); // process each user, one at a time
            }
        } finally {
            // Ensure the stream is cleaned up even if callback throws
            (pipeline as any).destroy?.();
        }
    }
}
