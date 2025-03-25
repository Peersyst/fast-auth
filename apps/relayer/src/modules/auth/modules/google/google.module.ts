import { Module } from "@nestjs/common";
import { GoogleAuthService } from "./google.service";

@Module({
    providers: [GoogleAuthService],
    exports: [GoogleAuthService],
})
export class GoogleModule {}
