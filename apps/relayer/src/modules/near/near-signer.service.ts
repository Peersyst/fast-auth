import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Signer } from "./signer";

@Injectable()
export class NearSignerService {
    private signerIterator = 0;

    private readonly signers: Signer[] = [];

    constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
        for (const secret of this.configService.get("near.privateKeys") as string[]) {
            const signer = new Signer(secret);
            this.signers.push(signer);
        }
    }

    /**
     * Requests a signer.
     * @returns The signer.
     */
    async requestSigner(): Promise<Signer> {
        return this.signers[this.signerIterator++ % this.signers.length];
    }

    /**
     * Releases a signer.
     * @param _ The signer to release.
     * @returns A promise that resolves when the signer is released.
     */
    async releaseSigner(_: Signer): Promise<void> {}
}
