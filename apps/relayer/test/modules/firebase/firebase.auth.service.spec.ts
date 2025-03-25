import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseAuthService } from "../../../src/modules/firebase/firebase.auth.service";

describe("FirebaseAuthService", () => {
    let service: FirebaseAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FirebaseAuthService],
        }).compile();

        service = module.get<FirebaseAuthService>(FirebaseAuthService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
