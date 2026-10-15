import { config } from "dotenv";
import { join } from "node:path";

config({ path: join(__dirname, "..", "..", ".env.test"), override: true });
