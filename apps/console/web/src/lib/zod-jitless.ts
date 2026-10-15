import { z } from "zod";

// Zod 4 probes `new Function` and falls back to interpreting when it throws, but under the console's CSP
// (`script-src 'self'`) the probe is itself reported as a violation. `jitless` skips the probe. Zod reads this flag when
// it builds a schema, so main.tsx imports this module before anything that defines one.
z.config({ jitless: true });
