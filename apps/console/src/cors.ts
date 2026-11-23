import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import type { Request } from "express";

/**
 * Picks the CORS options of a request. The executor that calls the dApp client lookup runs in a sandboxed iframe whose origin
 * is `null`, so that route is open to every origin, and every other route answers only the web app.
 * @param publicUrl The web app's origin.
 * @param prefix The global route prefix the app is served under, such as `/api/console`, or empty when it has none.
 * @returns The delegate for `enableCors`, which also answers the preflight.
 */
export function corsOptions(publicUrl: string | undefined, prefix = "") {
    const clientLookupPath = `${prefix}/dapp/client`;
    return (req: Request, callback: (error: Error | null, options?: CorsOptions) => void): void =>
        callback(null, req.path.replace(/\/$/, "") === clientLookupPath ? { origin: "*", methods: ["GET"] } : { origin: publicUrl });
}
