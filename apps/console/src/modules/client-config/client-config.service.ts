import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Auth0Config } from "../../config/auth0.config";
import { ClientConfigDto } from "./dtos/client-config.dto";

@Injectable()
export class ClientConfigService {
    constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

    /**
     * Reads the settings the web app needs to sign users in.
     * @returns The client configuration.
     */
    getConfig(): ClientConfigDto {
        return ClientConfigDto.fromAuth0Config(this.configService.get<Auth0Config>("auth0")!);
    }
}
