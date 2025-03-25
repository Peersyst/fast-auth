import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GoogleModule } from "./modules/google/google.module";
import { AuthController } from "./auth.controller";
import { FirebaseModule } from "../firebase/firebase.module";

@Module({
    providers: [AuthService],
    imports: [FirebaseModule, GoogleModule],
    controllers: [AuthController],
})
export class AuthModule {}
