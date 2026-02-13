export type IssuerConfig = {
    keyBase64: string;
    validationPublicKeyUrl: string;
    validationIssuerUrl: string;
    issuerUrl: string;
    ignoreExpiration: boolean;
};

export default (): IssuerConfig => {
    const keyBase64 = process.env.KEY_BASE64;
    const validationPublicKeyUrl = process.env.VALIDATION_PUBLIC_KEY_URL;
    const validationIssuerUrl = process.env.VALIDATION_ISSUER_URL;
    const issuerUrl = process.env.ISSUER_URL;
    const ignoreExpiration = process.env.IGNORE_EXPIRATION === "true";

    if (!keyBase64 || keyBase64.trim() === "") {
        throw new Error(
            "Missing required environment variable: KEY_BASE64. Please set KEY_BASE64 to the base64-encoded signing private key.",
        );
    }

    if (!validationPublicKeyUrl || validationPublicKeyUrl.trim() === "") {
        throw new Error(
            "Missing required environment variable: VALIDATION_PUBLIC_KEY_URL. Please set VALIDATION_PUBLIC_KEY_URL to the Firebase URL where the validation public key can be retrieved.",
        );
    }

    if (!validationIssuerUrl || validationIssuerUrl.trim() === "") {
        throw new Error(
            "Missing required environment variable: VALIDATION_ISSUER_URL. Please set VALIDATION_ISSUER_URL to the expected issuer URL that incoming JWTs should have.",
        );
    }

    if (!issuerUrl || issuerUrl.trim() === "") {
        throw new Error("Missing required environment variable: ISSUER_URL. Please set ISSUER_URL to the URL of the issuer service.");
    }

    // Validate URL format
    try {
        new URL(validationPublicKeyUrl.trim());
    } catch (_) {
        throw new Error(`Invalid VALIDATION_PUBLIC_KEY_URL: "${validationPublicKeyUrl}" is not a valid URL.`);
    }

    // Validate base64 format and ensure it decodes to a valid PEM key
    const trimmedKeyBase64 = keyBase64.trim();
    try {
        const decoded = Buffer.from(trimmedKeyBase64, "base64").toString("utf-8");
        // Basic validation that it decodes to something that looks like a PEM key
        if (!decoded.includes("-----BEGIN") || !decoded.includes("PRIVATE KEY")) {
            throw new Error("Decoded key does not appear to be a PEM private key");
        }
    } catch (error) {
        throw new Error(`Invalid KEY_BASE64: ${error instanceof Error ? error.message : "The value is not valid base64-encoded data."}`);
    }

    return {
        keyBase64: trimmedKeyBase64,
        validationPublicKeyUrl: validationPublicKeyUrl.trim(),
        validationIssuerUrl: validationIssuerUrl.trim(),
        issuerUrl: issuerUrl.trim(),
        ignoreExpiration,
    };
};
