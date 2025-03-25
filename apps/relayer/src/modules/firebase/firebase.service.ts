import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import admin from "firebase-admin";
import { FirebaseAuthService } from "./firebase.auth.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class FirebaseService implements OnModuleInit {
    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        @Inject(FirebaseAuthService) private readonly firebaseAuthService: FirebaseAuthService,
    ) {}

    /**
     * @inheritdoc
     */
    onModuleInit() {
        this.initializeFirebase();
    }

    /**
     * Initialize the Firebase service.
     */
    private initializeFirebase() {
        admin.initializeApp({
            credential: admin.credential.cert(this.configService.get("firebase.serviceAccountPath")),
        });
    }

    /**
     * Get the Firebase auth service.
     * @returns The Firebase auth service.
     */
    getAuthService(): FirebaseAuthService {
        return this.firebaseAuthService;
    }
}
