export class CustomTokenDto {
    token: string;

    /**
     * Create a custom token DTO from a string.
     * @param token The custom token.
     * @returns The custom token DTO.
     */
    static fromString(token: string): CustomTokenDto {
        return { token };
    }
}
