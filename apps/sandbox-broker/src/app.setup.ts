import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

// The path only: query strings and bodies carry codes, tokens and the payloads users sign.
morgan.token("path", (req: Request) => req.path);

/**
 * Sets up the middleware every response goes through. main.ts and the tests share it.
 * @param app The application.
 */
export function setUpApp(app: INestApplication): void {
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: false,
                directives: { defaultSrc: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"], frameAncestors: ["'none'"] },
            },
            // The sign-in popup answers the dApp through window.opener, which a cross-origin opener policy would cut.
            crossOriginOpenerPolicy: false,
            // The CSP's frame-ancestors covers framing, and lets the web_message page be framed by the dApp it answers.
            xFrameOptions: false,
        }),
    );
    app.use((_req: Request, res: Response, next: NextFunction) => {
        // Every answer carries a code, a token or a one-time redirect.
        res.setHeader("Cache-Control", "no-store");
        next();
    });
    app.use(morgan(":method :path :status - :response-time ms"));
    app.enableShutdownHooks();
}
