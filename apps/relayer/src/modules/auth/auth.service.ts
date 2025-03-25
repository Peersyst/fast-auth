import { Inject, Injectable } from "@nestjs/common";
import { GoogleAuthService } from "./modules/google/google.service";
import { FirebaseService } from "../firebase/firebase.service";

@Injectable()
export class AuthService {
    constructor(
        @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
        @Inject(GoogleAuthService) private readonly googleAuthService: GoogleAuthService,
    ) {}

    /**
     * Create a custom token for the user.
     * @param code The auth code from Google.
     * @returns The custom token.
     */
    async createCustomTokenWithGoogle(code: string): Promise<string> {
        const { accessToken } = await this.googleAuthService.exchangeAuthCodeForIdToken(code);

        const userInfo = await this.googleAuthService.getUserInfo(accessToken);

        let firebaseUser = await this.firebaseService.getAuthService().getUserByEmail(userInfo.email);

        if (!firebaseUser) {
            firebaseUser = await this.firebaseService.getAuthService().createUser(userInfo.id, userInfo.email, userInfo.name);
        }

        return this.firebaseService.getAuthService().createCustomToken(firebaseUser.uid);
    }
}
