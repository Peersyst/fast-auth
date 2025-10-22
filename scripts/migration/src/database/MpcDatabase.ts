import * as fs from "node:fs";

export type MpcUser = {
    encrypted_key_pair: string;
    internal_account_id: string;
    node: number;
    public_key: string;
};

export class MpcDatabase {
    database: MpcUser[];

    constructor(private readonly exportFile: string) {
        const file = fs.readFileSync(this.exportFile);
        this.database = JSON.parse(file.toString());
    }

    /**
     *
     */
    findAll(): MpcUser[] {
        return this.database;
    }
}
