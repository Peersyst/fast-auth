import { Module } from "@nestjs/common";
import { NearSignerService } from "./near-signer.service";
import { NearClientService } from "./near-client.service";

@Module({
    providers: [NearSignerService, NearClientService],
    exports: [NearSignerService, NearClientService],
})
export class NearModule {}
