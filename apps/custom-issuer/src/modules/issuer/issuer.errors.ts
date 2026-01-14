export enum ErrorMessage {
    INVALID_TOKEN = "Invalid JWT token",
    MISSING_SUB = 'JWT missing required "sub" claim',
    INVALID_ISSUER = "JWT issuer does not match expected validation issuer",
    INVALID_EXP_TYPE = 'JWT "exp" claim must be a valid integer',
    TOKEN_EXPIRED = "JWT token has expired",
    INVALID_NBF_TYPE = 'JWT "nbf" claim must be a valid integer',
    TOKEN_NOT_YET_VALID = "JWT token is not yet valid (nbf is in the future)",
    EXP_BEFORE_NBF = 'JWT "exp" must be after "nbf"',
}
